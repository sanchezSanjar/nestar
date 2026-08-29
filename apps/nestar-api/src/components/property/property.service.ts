import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Property, Properties } from '../../libs/dto/property/property';
import { Message } from '../../libs/enums/common.enum';
import { PropertyInput, PropertiesInquiry, AgentPropertiesInquiry, AllPropertiesInquiry } from '../../libs/dto/property/property.input';
import { MemberService } from '../member/member.service';
import { ViewService } from '../view/view.service';
import { ViewGroup } from '../../libs/enums/view.enum';
import { PropertyStatus } from '../../libs/enums/property.enum';
import { StatisticModifier, T } from '../../libs/types/common';
import { PropertyUpdate } from '../../libs/dto/property/property.update';
import { Direction } from '../../libs/enums/common.enum';
import moment from 'moment';
import { shapeIntoMongoObjectId, lookupMember  } from '../../libs/config';


@Injectable()
export class PropertyService {
	constructor(
		@InjectModel('Property') private readonly propertyModel: Model<Property>,
		private memberService: MemberService,
		private viewService: ViewService,
	) {}

	public async createProperty(input: PropertyInput): Promise<Property> {
		try {
			const result = await this.propertyModel.create(input);
			await this.memberService.memberStatsEditor({
				_id: result.memberId,
				targetKey: 'memberProperties',
				modifier: 1,
			});
			return result;
		} catch (err) {
			console.log('Error, Service.model:', err instanceof Error ? err.message : err);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getProperty(memberId: ObjectId, propertyId: ObjectId): Promise<Property> {
		const search: T = {
			_id: propertyId,
			propertyStatus: PropertyStatus.ACTIVE,
		};

		const targetProperty = await this.propertyModel.findOne(search).lean().exec() as unknown as Property;
		if (!targetProperty) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		if (memberId) {
			const viewInput = { memberId, viewRefId: propertyId, viewGroup: ViewGroup.PROPERTY };
			const newView = await this.viewService.recordView(viewInput);
			if (newView) {
				await this.propertyStatsEditor({ _id: propertyId, targetKey: 'propertyViews', modifier: 1 });
				targetProperty.propertyViews++;
			}
			//meLiked
		}

		targetProperty.memberData = await this.memberService.getMember(targetProperty.memberId, memberId);
		return targetProperty;
	}

	public async propertyStatsEditor(input: StatisticModifier): Promise<Property> {
		const { _id, targetKey, modifier } = input;
		const result = await this.propertyModel
			.findByIdAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true })
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		return result;
	}

    public async updateProperty (memberId: ObjectId, input: PropertyUpdate): Promise<Property> {
        let { propertyStatus, soldAt, deletedAt} = input;
		const search: T = {
			_id: input._id,
            memberId:memberId,
			propertyStatus: PropertyStatus.ACTIVE,
		};

		if (propertyStatus === PropertyStatus.SOLD) soldAt = moment().toDate();
        else if (propertyStatus === PropertyStatus.DELETE) deletedAt = moment().toDate();


        const result = await this.propertyModel
            .findOneAndUpdate(search, input, {new: true})
            .exec();
        if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

        
		if (soldAt || deletedAt) {
            await this.memberService.memberStatsEditor({
                _id:  memberId,
                targetKey: 'memberProperties',
                modifier: -1,
            });
        }

        return result;
    }

    public async getProperties(memberId: ObjectId, input: PropertiesInquiry): Promise<Properties> {
      const match: T = { propertyStatus: PropertyStatus.ACTIVE };
        const sort: T = { [input.sort ?? "createdAt"]: input?.direction ?? Direction.DESC };

        this.shapeMatchQuery(match, input);
        console.log('match:', match);

        const result = await this.propertyModel
            .aggregate([
            { $match: match },
            { $sort: sort },
            {
                $facet: {
                list: [
                    { $skip: (input.page - 1) * input.limit },
                    { $limit: input.limit },
                    // meLiked
                    {
                    $lookup: {
                        from: 'members',
                        localField: '_id',
                        foreignField: 'memberData',
                        as: 'memberData',
                    },
                    },
                ],
                metaCounter: [{ $count: 'total' }],
                },
            },
            ])
            .exec();

        if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

        return result[0];
        }

        private shapeMatchQuery(match: T, input: PropertiesInquiry): void {
            const {
                memberId,
                locationList,
                roomsList,
                bedsList,
                typeList,
                periodsRange,
                pricesRange,
                squaresRange,
                options,
                text,
            } = input.search;

            if (memberId) match.memberId = shapeIntoMongoObjectId(memberId);
            if (locationList) match.propertyLocation = { $in: locationList };
            if (roomsList) match.propertyRooms = { $in: roomsList };
            if (bedsList) match.propertyBeds = { $in: bedsList };
            if (typeList) match.propertyType = { $in: typeList };

            if (pricesRange)
                match.propertyPrice = {
                $gte: pricesRange.start,
                $lte: pricesRange.end,
                };

            if (periodsRange)
                match.createdAt = {
                $gte: periodsRange.start,
                $lte: periodsRange.end,
                };

            if (squaresRange)
                match.propertySquare = {
                $gte: squaresRange.start,
                $lte: squaresRange.end,
                };

            if (text) match.propertyTitle = { $regex: new RegExp(text, 'i') };

            if (options) {
                match['$or'] = options.map((ele) => {
                return { [ele]: true };
                });
            }
        }

        public async getAgentProperties(
            memberId: ObjectId,
            input: AgentPropertiesInquiry,
            ): Promise<Properties> {
            const { propertyStatus } = input.search;

            if (propertyStatus === PropertyStatus.DELETE)
                throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);

            const match: T = {
                memberId: memberId,
                propertyStatus: propertyStatus ?? { $ne: PropertyStatus.DELETE },
            };

            const sort: T = {
                [input.sort ?? 'createdAt']: input.direction ?? Direction.DESC,
            };

            const result = await this.propertyModel
                .aggregate([
                { $match: match },
                { $sort: sort },
                {
                    $facet: {
                    list: [
                        { $skip: (input.page - 1) * input.limit },
                        { $limit: input.limit },
                        lookupMember,
                        { $unwind: '$memberData' },
                    ],
                    metaCounter: [{ $count: 'total' }],
                    },
                },
                ])
                .exec();

            if (!result.length)
                throw new InternalServerErrorException(Message.NO_DATA_FOUND);

            return result[0];
            }

    public async getAllPropertiesByAdmin(
        input: AllPropertiesInquiry,
        ): Promise<Properties> {
        const { propertyStatus, propertyLocationList } = input.search;
        const match: T = {};

        const sort: T = {
            [input.sort ?? 'createdAt']: input.direction ?? Direction.DESC,
        };

        if (propertyStatus) match.propertyStatus = propertyStatus;
        if (propertyLocationList)
            match.propertyLocation = { $in: propertyLocationList };

        const result = await this.propertyModel
            .aggregate([
            { $match: match },
            { $sort: sort },
            {
                $facet: {
                list: [
                    { $skip: (input.page - 1) * input.limit },
                    { $limit: input.limit }, // property-1, property-2
                    lookupMember,   //memberData: (memberDataValue)
                    { $unwind: '$memberData' }, //memberData: memberDataValue
                ],
                metaCounter: [{ $count: 'total' }],
                },
            },
            ])
            .exec();

        if (!result.length)
            throw new InternalServerErrorException(Message.NO_DATA_FOUND);

        return result[0];
        }
}