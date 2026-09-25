import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, type ObjectId } from 'mongoose';
import { MemberService } from '../member/member.service';
import { PropertyService } from '../property/property.service';
import { BoardArticleService } from '../board-article/board-article.service';
import { CommentInput, CommentsInquiry } from '../../libs/dto/comment/comment.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { CommentGroup, CommentStatus } from '../../libs/enums/comment.enum';
import { CommentUpdate } from '../../libs/dto/comment/comment.update';
import { Comments, Comment } from '../../libs/dto/comment/comment';
import { lookupMember } from '../../libs/config';
import { T } from '../../libs/types/common';
import { PropertyStatus } from '../../libs/enums/property.enum';
import { BoardArticleStatus } from '../../libs/enums/board-article.enum';
import { MemberStatus } from '../../libs/enums/member.enum';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel('Comment') private readonly commentModel: Model<Comment>,
    @InjectModel('Property') private readonly propertyModel: Model<T>,
    @InjectModel('BoardArticle') private readonly boardArticleModel: Model<T>,
    @InjectModel('Member') private readonly memberModel: Model<T>,
    private readonly memberService: MemberService,
    private readonly propertyService: PropertyService,
    private readonly boardArticleService: BoardArticleService,
  ) {}

    public async createComment(memberId: ObjectId, input: CommentInput): Promise<Comment> {
    input.memberId = memberId;

    const targetExists = await this.checkCommentTarget(input.commentGroup, input.commentRefId);
    if (!targetExists) throw new BadRequestException(Message.NO_DATA_FOUND);

    let result: Comment | null = null;
    try {
        result = await this.commentModel.create(input) as unknown as Comment;
    } catch (err) {
        console.log('Error, Service.model:', err instanceof Error ? err.message : err);
        throw new BadRequestException(Message.CREATE_FAILED);
    }

    await this.commentStatsEditor(input.commentGroup, input.commentRefId, 1);

    if (!result) throw new InternalServerErrorException(Message.CREATE_FAILED);
    return result;
    }

    public async updateComment(memberId: ObjectId, input: CommentUpdate): Promise<Comment> {
        const {_id} = input;
        const result = await this.commentModel.findOneAndUpdate(
            {
                _id: _id,
                memberId: memberId,
                commentStatus: CommentStatus.ACTIVE,
            },
            input,
            {
                new: true,
            },
        );
        if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

        if (input.commentStatus === CommentStatus.DELETE) {
            await this.commentStatsEditor(result.commentGroup, result.commentRefId, -1);
        }
        return result;
    }

    private async checkCommentTarget(commentGroup: CommentGroup, commentRefId: ObjectId): Promise<boolean> {
        switch (commentGroup) {
            case CommentGroup.PROPERTY:
                return !!(await this.propertyModel.exists({ _id: commentRefId, propertyStatus: PropertyStatus.ACTIVE }));
            case CommentGroup.ARTICLE:
                return !!(await this.boardArticleModel.exists({ _id: commentRefId, articleStatus: BoardArticleStatus.ACTIVE }));
            case CommentGroup.MEMBER:
                return !!(await this.memberModel.exists({ _id: commentRefId, memberStatus: MemberStatus.ACTIVE }));
            default:
                return false;
        }
    }

    private async commentStatsEditor(commentGroup: CommentGroup, commentRefId: ObjectId, modifier: number): Promise<void> {
        switch (commentGroup) {
            case CommentGroup.PROPERTY:
                await this.propertyService.propertyStatsEditor({ _id: commentRefId, targetKey: 'propertyComments', modifier });
                break;
            case CommentGroup.ARTICLE:
                await this.boardArticleService.boardArticleStatsEditor({ _id: commentRefId, targetKey: 'articleComments', modifier });
                break;
            case CommentGroup.MEMBER:
                await this.memberService.memberStatsEditor({ _id: commentRefId, targetKey: 'memberComments', modifier });
                break;
        }
    }

    public async getComments(memberId: ObjectId, input: CommentsInquiry): Promise<Comments> {
    const { commentRefId } = input.search;
    const match: T = { commentRefId: commentRefId, commentStatus: CommentStatus.ACTIVE };
    const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

    const result: Comments[] = await this.commentModel.aggregate([
        { $match: match },
        { $sort: sort },
        {
        $facet: {
            list: [
            { $skip: (input.page - 1) * input.limit },
            { $limit: input.limit },
            // meLiked
            lookupMember,
            { $unwind: '$memberData' },
            ],
            metaCounter: [{ $count: 'total' }],
        },
        },
    ]);
    if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    return result[0];
    }

    public async removeCommentByAdmin(input: ObjectId): Promise<Comment> {
        const result = await this.commentModel.findByIdAndDelete(input);
        if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);

        // DELETE-status comments were already subtracted in updateComment
        if (result.commentStatus === CommentStatus.ACTIVE) {
            try {
                await this.commentStatsEditor(result.commentGroup, result.commentRefId, -1);
            } catch (err) {
                console.log('Error, commentStatsEditor:', err instanceof Error ? err.message : err);
            }
        }
        return result;
    }}