import { Mutation, Resolver, Query, Args  } from '@nestjs/graphql';
import { MemberService } from './member.service';
import {AgentsInquiry, MemberInput, LoginInput ,MembersInquiry,} from '../../libs/dto/member/member.input';
import { Member, Members } from '../../libs/dto/member/member';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorators';
import type { ObjectId} from 'mongoose';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberUpdate } from '../../libs/dto/member/member.update';
import {getSerialForImage, shapeIntoMongoObjectId, validMimeTypes} from '../../libs/config';
import { WithoutGuard } from '../auth/guards/without.guard';
import { GraphQLUpload, FileUpload } from 'graphql-upload';
import { createWriteStream } from 'fs';
import { Message } from '../../libs/enums/common.enum';

@Resolver()
export class MemberResolver {
    constructor(private readonly memberService: MemberService) {}
 
    @Mutation(() => Member)
    public async signup(@Args("input") input: MemberInput ): Promise<Member> {
            console.log('Mutation: signup');
            return this.memberService.signup(input);      
    }

    @Mutation(() => Member)
    public async login(@Args("input") input: LoginInput ): Promise<Member> {
            console.log('Mutation: login');
            return this.memberService.login(input);
    }
  
    // Authenticated Check
	@UseGuards(AuthGuard)
	@Query(() => String)
	public checkAuth(@AuthMember('memberNick') memberNick: string): string {
		console.log('Query: checkAuth');
		console.log('memberNick:', memberNick);
		return `Hi ${memberNick}`;
	}

    // Authorization Check
    @Roles(MemberType.USER, MemberType.AGENT)
  	@UseGuards(RolesGuard)
	@Query(() => String)
	public checkAuthRoles(@AuthMember() authMember: Member): string {
		console.log('Query: checkAuthRoles');
		return `Hi ${authMember.memberNick}, you are ${authMember.memberType} (memberId: ${authMember._id.toString()})`;
	}

    // Authenticated
	@UseGuards(AuthGuard)
	@Mutation(() => Member)
	public async updateMember(
		@Args('input') input: MemberUpdate,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Member> {
		console.log('Mutation: updateMember');
		delete (input as any)._id;
		return this.memberService.updateMember(memberId as unknown as ObjectId, input);
	}

    @UseGuards(WithoutGuard)
    @Query(() => Member)
    public async getMember(
		@Args('targetId') input: string,
		@AuthMember('_id') memberId:  ObjectId,
	): Promise<Member> {
        console.log('Query: getMember');
        const targetId = shapeIntoMongoObjectId(input);
		return await this.memberService.getMember(targetId, memberId);
    }
    
    @UseGuards(WithoutGuard)
	@Query(() => Members)
	public async getAgents(
		@Args('input') input: AgentsInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Members> {
		console.log('Query: getAgents');
		return await this.memberService.getAgents(memberId, input);
	}
    
    /** ADMIN */

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => Members)
	public async getAllMembersByAdmin(
		@Args('input') input: MembersInquiry,
	): Promise<Members> {
		console.log('Query: getAllMembersByAdmin');
		return await this.memberService.getAllMembersByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Member)
	public async updateMembersByAdmin(@Args('input') input: MemberUpdate): Promise<Member> {
		console.log('Mutation: updateMembersByAdmin');
		return await this.memberService.updateMembersByAdmin(input);
	}


	/** UPLOADER */

	@UseGuards(AuthGuard)
	@Mutation((returns) => String)
	public async imageUploader(
		@Args({ name: 'file', type: () => GraphQLUpload })
		{ createReadStream, filename, mimetype }: FileUpload,
		@Args('target') target: string,
	): Promise<string> {
		console.log('Mutation: imageUploader');

		if (!filename) throw new Error(Message.UPLOAD_FAILED);
		const validMime = validMimeTypes.includes(mimetype);
		if (!validMime) throw new Error(Message.PROVIDE_ALLOWED_FORMAT);

		const imageName = getSerialForImage(filename);
		const url = `uploads/${target}/${imageName}`;
		const stream = createReadStream();

		const result = await new Promise((resolve, reject) => {
			stream
				.pipe(createWriteStream(url))
				.on('finish', async () => resolve(true))
				.on('error', () => reject(false));
		});
		if (!result) throw new Error(Message.UPLOAD_FAILED);

		return url;
	}

	@UseGuards(AuthGuard)
	@Mutation((returns) => [String])
	public async imagesUploader(
		@Args('files', { type: () => [GraphQLUpload] })
		files: Promise<FileUpload>[],
		@Args('target') target: string,
	): Promise<string[]> {
		console.log('Mutation: imagesUploader');

		const uploadedImages:string[] = [];
		const promisedList = files.map(
			async (img: Promise<FileUpload>, index: number): Promise<Promise<void>> => {
				try {
					const { filename, mimetype, encoding, createReadStream } = await img;

					const validMime = validMimeTypes.includes(mimetype);
					if (!validMime) throw new Error(Message.PROVIDE_ALLOWED_FORMAT);

					const imageName = getSerialForImage(filename);
					const url = `uploads/${target}/${imageName}`;
					const stream = createReadStream();

					const result = await new Promise((resolve, reject) => {
						stream
							.pipe(createWriteStream(url))
							.on('finish', () => resolve(true))
							.on('error', () => reject(false));
					});
					if (!result) throw new Error(Message.UPLOAD_FAILED);

					uploadedImages[index] = url;
				} catch (err) {
					console.log('Error, file missing!');
				}
			},
		);

		await Promise.all(promisedList);
		return uploadedImages;
	}
}
