import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Member } from '../../libs/dto/member/member';
import { T } from '../../libs/types/common';
import { JwtService } from '@nestjs/jwt';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Message } from '../../libs/enums/common.enum';
import { MemberStatus } from '../../libs/enums/member.enum';

@Injectable()
export class AuthService {
    constructor(
		private JwtService: JwtService,
		@InjectModel('Member') private readonly memberModel: Model<Member>,
	) {}
	public async hashPassword(memberPassword: string): Promise<string> {
		const salt = await bcrypt.genSalt();
		return await bcrypt.hash(memberPassword, salt);
	}

	public async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
		return await bcrypt.compare(password, hashedPassword);
	}

    public async createToken(member: Member): Promise<string> {
		const payload: T = {};
		Object.keys(member['_doc'] ? member['_doc'] : member).map((ele) => {
			payload[`${ele}`] = member[`${ele}`];
		});
		delete payload.memberPassword;
		//console.log('payload:', payload);
		return await this.JwtService.signAsync(payload);
	}

	public async verifyToken(token: string): Promise<Member> {
		let payload: T;
		try {
			payload = await this.JwtService.verifyAsync(token);
		} catch (err) {
			throw new UnauthorizedException(Message.NOT_AUTHENTICATED);
		}

		// Token payload is a login-time snapshot: re-read status and role from DB
		const member = await this.memberModel
			.findOne({ _id: shapeIntoMongoObjectId(payload._id), memberStatus: MemberStatus.ACTIVE })
			.lean()
			.exec();
		if (!member) throw new UnauthorizedException(Message.NOT_AUTHENTICATED);
		return member as Member;
	}
}