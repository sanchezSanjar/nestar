import { Types } from 'mongoose';
import { BadRequestException } from '@nestjs/common';
import { T } from './types/common';
import { Message } from './enums/common.enum';

export const availableAgentSorts = [
	'createdAt',
	'updatedAt',
	'memberLikes',
	'memberViews',
	'memberRank',
];

export const availableMemberSorts = [
	'createdAt',
	'updatedAt',
	'memberLikes',
	'memberViews',
];

export const availableOptions = ['propertyBarter', 'propertyRent'];
export const availablePropertySorts = [
	'createdAt',
	'updatedAt',
	'propertyLikes',
	'propertyViews',
	'propertyRank',
	'propertyPrice',
]

export const availableBoardArticleSorts = ['createdAt', 'updatedAt', 'articleLikes', 'articleViews'];
export const availableCommentSorts = ['createdAt', 'updatedAt']

 // IMAGE CONFIGURATION (config.js)
import { v4 as uuidv4 } from 'uuid';

export const validMimeTypes = ['image/png', 'image/jpg', 'image/jpeg'];
export const validUploadTargets = ['member', 'property', 'article'];

const mimeExtensions: Record<string, string> = {
	'image/png': '.png',
	'image/jpg': '.jpg',
	'image/jpeg': '.jpg',
};

// Extension comes from the validated mimetype, never from the client filename
export const getSerialForImage = (mimetype: string) => {
	return uuidv4() + mimeExtensions[mimetype];
};

export const shapeIntoMongoObjectId = (target: any) => {
	if (typeof target !== 'string') return target;
	if (!Types.ObjectId.isValid(target)) throw new BadRequestException(Message.BAD_REQUEST);
	return new Types.ObjectId(target);
};

export const lookupAuthMemberLiked = (memberId: T, targetRefId: string = '$_id') => {
	return {
		$lookup: {
			from: 'likes',
			let: {
				localLikeRefId: targetRefId,
				localMemberId: memberId,
				localMyFavorite: true,
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$and: [
								{ $eq: ['$likeRefId', '$$localLikeRefId'] },
								{ $eq: ['$memberId', '$$localMemberId'] },
							],
						},
					},
				},
				{
					$project: {
						_id: 0,
						memberId: 1,
						likeRefId: 1,
						myFavorite: '$$localMyFavorite',
					},
				},
			],
			as: 'meLiked',
		},
	};
};

interface LookupAuthMemberFollowed {
	followerId: T;
	followingId: string;
}
export const lookupAuthMemberFollowed = (input: LookupAuthMemberFollowed) => {
	const { followerId, followingId } = input;
	return {
		$lookup: {
			from: 'follow',
			let: {
				localFollowerId: followerId,
				localFollowingId: followingId,
				localMyFavorite: true,
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$and: [
								{ $eq: ['$followerId', '$$localFollowerId'] },
								{ $eq: ['$followingId', '$$localFollowingId'] },
							],
						},
					},
				},
				{
					$project: {
						_id: 0,
						followerId: 1,
						followingId: 1,
						myFollowing: '$$localMyFavorite',
					},
				},
			],
			as: 'meFollowed',
		},
	};
};


export const lookupMember = {
	$lookup: {
		from: 'members',
		localField: 'memberId',
		foreignField: '_id',
		as: 'memberData',
	},
};


export const lookupFollowingData = {
	$lookup: {
		from: 'members',
		localField: 'followingId',
		foreignField: '_id',
		as: 'followingData',
	},
};

export const lookupFollowerData = {
	$lookup: {
		from: 'members',
		localField: 'followerId',
		foreignField: '_id',
		as: 'followerData',
	},
};


export const lookupFavorite = {
	$lookup: {
		from: 'members',
		localField: 'favoriteProperty.memberId',
		foreignField: '_id',
		as: 'favoriteProperty.memberData',
	},
};



export const lookupVisit = {
	$lookup: {
		from: 'members',
		localField: 'visitedProperty.memberId',
		foreignField: '_id',
		as: 'visitedProperty.memberData',
	},
};

// Mongo duplicate-key errors (E11000) become a 400 instead of leaking as a 500
export const handleDuplicateKey = (message: string) => (err: any) => {
	if (err?.code === 11000) throw new BadRequestException(message);
	throw err;
};

export const escapeRegex = (text: string): string => {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
