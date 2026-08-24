import { Mutation, Resolver, Query, Args  } from '@nestjs/graphql';
import { MemberService } from './member.service';
import { MemberInput, LoginInput } from '../../libs/dto/member/member.input';
import { Member } from '../../libs/dto/member/member';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorators';
import type { ObjectId, Types } from 'mongoose';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberUpdate } from '../../libs/dto/member/member.update';

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
		return `Hi ${authMember.memberNick}, you are ${authMember.memberType} (memberId: ${authMember._id})`;
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

    @Query(() => String)
    public async getMember(): Promise<string> {
        console.log('Query: getMember');
        return this.memberService.getMember();
    }
    
    /** ADMIN */

	// Authorization: ADMIN
    @Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => String)
	public async getAllMembersByAdmin(): Promise<string> {
		return await this.memberService.getAllMembersByAdmin();
	}

	// Authorization: ADMIN
	@Mutation(() => String)
	public async updateMembersByAdmin(): Promise<string> {
		console.log('Mutation: updateMembersByAdmin');
		return await this.memberService.updateMembersByAdmin();
	}
}
