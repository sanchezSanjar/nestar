import { Module } from '@nestjs/common';
import { CommentResolver } from './comment.resolver';
import { CommentService } from './comment.service';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { MemberModule } from '../member/member.module';
import { PropertyModule } from '../property/property.module';
import CommentSchema from '../../shemas/Comment.model';
import PropertySchema from '../../shemas/Property.model';
import BoardArticleSchema from '../../shemas/BoardArticle.model';
import MemberSchema from '../../shemas/Member.model';
import { BoardArticleModule } from '../board-article/board-article.module';

@Module({
    imports: [
		MongooseModule.forFeature([{ name: 'Comment', schema: CommentSchema}]),
		MongooseModule.forFeature([{ name: 'Property', schema: PropertySchema }]),
		MongooseModule.forFeature([{ name: 'BoardArticle', schema: BoardArticleSchema }]),
		MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }]),
		AuthModule,
    MemberModule,
    PropertyModule, 
    BoardArticleModule
	],
	providers: [CommentResolver, CommentService],
})
export class CommentModule {}
