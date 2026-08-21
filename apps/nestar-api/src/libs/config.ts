import { ObjectId } from 'bson';

export const shapeIntoMongoObjectId = (target: any) => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return typeof target === 'string' ? new ObjectId(target) : target;
};