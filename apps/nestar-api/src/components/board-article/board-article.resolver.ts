import { Query, Args, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { WithoutGuard } from '../auth/guards/without.guard';
import { BoardArticleService } from './board-article.service';
import { BoardArticleUpdate } from '../../libs/dto/board-article/board-article.update';
import { BoardArticleInput, BoardArticlesInquiry, AllBoardArticlesInquiry } from '../../libs/dto/board-article/board-article.input';
import { BoardArticle, BoardArticles } from '../../libs/dto/board-article/board-article';
import { shapeIntoMongoObjectId } from '../../libs/config';
import type { ObjectId } from 'mongoose';
import { AuthMember } from '../auth/decorators/authMember.decorators';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { RolesGuard } from '../auth/guards/roles.guard';


@Resolver()
export class BoardArticleResolver {
    constructor(private readonly boardArticleService: BoardArticleService) {}

    @UseGuards(AuthGuard)
        @Mutation((returns) => BoardArticle)
        public async createBoardArticle(
            @Args('input') input: BoardArticleInput,
            @AuthMember('_id') memberId: ObjectId,
        ): Promise<BoardArticle> {
            console.log('Mutation: createBoardArticle');
            return await this.boardArticleService.createBoardArticle(memberId, input);
        }

    @UseGuards(WithoutGuard)
    @Query(() => BoardArticle)
        public async getBoardArticle(
        @Args('articleId') input: string,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<BoardArticle> {
        console.log('Query: getProperty()');
        const articleId = shapeIntoMongoObjectId(input);
        return await this.boardArticleService.getBoardArticle(memberId, articleId);
    }
        
    
    @UseGuards(AuthGuard)
        @Mutation((returns) => BoardArticle)
        public async updateBoardArticle(
            @Args('input') input: BoardArticleUpdate,
            @AuthMember('_id') memberId: ObjectId,
        ): Promise<BoardArticle> {
            console.log('Mutation: updateBoardArticle');
            input._id = shapeIntoMongoObjectId(input._id);
            return await this.boardArticleService.updateBoardArticle(memberId, input);
        }

    @UseGuards(WithoutGuard)
    @Query((returns) => BoardArticle)
    public async getBoardArticles(
        @Args('input') input: BoardArticlesInquiry,
        @AuthMember('_id') memberId: ObjectId,
        ): Promise<BoardArticles>{
            console.log('Query getBoardArticles');
            return await this.boardArticleService.getBoardArticles(memberId, input)
        }

        /** ADMIN **/

    @Roles(MemberType.ADMIN)
    @UseGuards(RolesGuard)
    @Query((returns) => BoardArticles)
        public async getAllBoardArticlesByAdmin(
        @Args('input') input: AllBoardArticlesInquiry,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<BoardArticles> {
        console.log('Query: getAllBoardArticlesByAdmin');
        return await this.boardArticleService.getAllBoardArticlesByAdmin(input);
    }

    @Roles(MemberType.ADMIN)
    @UseGuards(RolesGuard)
    @Mutation(() => BoardArticle)
        public async updateBoardArticleByAdmin(
        @Args('input') input: BoardArticleUpdate,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<BoardArticle> {
        console.log('Query: updateBoardArticleByAdmin');
        input._id = shapeIntoMongoObjectId(input._id);
        return await this.boardArticleService.updateBoardArticleByAdmin(input);
    }

    @Roles(MemberType.ADMIN)
    @UseGuards(RolesGuard)
    @Mutation((returns) => BoardArticle)
        public async removeBoardArticleByAdmin(
        @Args('articleId') input: string,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<BoardArticle> {
        console.log('Mutation: removeBoardArticleByAdmin');
        const articleId =shapeIntoMongoObjectId(input);
        return await this.boardArticleService.removeBoardArticleByAdmin(articleId);
    }

    }

