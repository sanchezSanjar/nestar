import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import { PropertyLocation, PropertyType, PropertyStatus } from '../../enums/property.enum';
import type{ ObjectId } from 'mongoose';

@InputType()
export class PropertyUpdate {
    @IsNotEmpty()
    @Field(() => String)
    _id: ObjectId;

    @IsNotEmpty()
    @Field(() => PropertyType,{nullable:true})
    propertyType?: PropertyType;

    @IsNotEmpty()
    @Field(() => PropertyStatus,{nullable:true})
    propertyStatus?: PropertyStatus;

    @IsNotEmpty()
    @Field(() => PropertyLocation,{nullable:true})
    propertyLocation?: PropertyLocation;

    @IsNotEmpty()
    @Length(3, 100)
    @Field(() => String, {nullable:true})
    propertyAddress?: string;

    @IsNotEmpty()
    @Length(3, 100)
    @Field(() => String, {nullable:true})
    propertyTitle?: string;

    @IsNotEmpty()
    @Field(() => Number,{nullable:true})
    propertyPrice?: number;

    @IsNotEmpty()
    @Field(() => Number, {nullable:true})
    propertySquare?: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    @Field(() => Int,{nullable:true})
    propertyBeds?: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    @Field(() => Int,{nullable:true})
    propertyRooms?: number;

    @IsNotEmpty()
    @Field(() => [String],{nullable:true})
    propertyImages?: string[];

    @IsOptional()
    @Length(5, 500)
    @Field(() => String, { nullable: true })
    propertyDesc?: string;

    @IsOptional()
    @Field(() => Boolean, { nullable: true })
    propertyBarter?: boolean;

    @IsOptional()
    @Field(() => Boolean, { nullable: true })
    propertyRent?: boolean;

    soldAt?: Date;
    
    deletedAt?: Date;

    @IsOptional()
    @Field(() => Date, { nullable: true })
    constructedAt?: Date;
}