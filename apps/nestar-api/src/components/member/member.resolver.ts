import { Mutation, Resolver, Query, Args  } from '@nestjs/graphql';
import { MemberService } from './member.service';
import { MemberInput, LoginInput } from '../../libs/dto/member/member.input';
import { Member } from '../../libs/dto/member/member';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorators';
import type { ObjectId } from 'mongoose';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { RolesGuard } from '../auth/guards/roles.guard';

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
    //Authenticated
    @UseGuards(AuthGuard)
    @Mutation(() => String)
    public async updateMember(@AuthMember('_id') memberId: ObjectId): Promise<string> {
        console.log('Mutation: updateMember');
        //console.log(typeof memberId);
		//console.log(memberId);
        return this.memberService.updateMember();
    }

    // Authenticated check
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
		return `Hi ${authMember.memberNick}, you are ${authMember.memberType}`;
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
