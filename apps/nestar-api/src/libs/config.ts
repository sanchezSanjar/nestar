import { ObjectId } from 'bson';

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


export const shapeIntoMongoObjectId = (target: any) => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return typeof target === 'string' ? new ObjectId(target) : target;
};