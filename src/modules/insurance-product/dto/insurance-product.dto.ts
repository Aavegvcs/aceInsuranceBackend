import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Insurance_Type } from 'src/utils/app.utils';

export class CreateInsuranceProductDto {
    @ApiProperty({ example: 'Insurance A', description: 'name of insurance' })
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'HEALTH', description: 'Type of insurance', enum: Insurance_Type })
    @IsOptional()
    @IsEnum(Insurance_Type)
    insuranceType?: Insurance_Type;

    // @ApiProperty({ example: 'family', description: 'Subtype of insurance' })
    // @IsOptional()
    // insuranceSubType?: number;

    @ApiProperty({ example: 1, description: 'Branch ID associated with the insurance product' })
    @IsOptional()
    @IsNumber()
    branchId?: string;

    @ApiProperty({ example: 2, description: 'Insurance company ID associated with the product' })
    @IsOptional()
    @IsNumber()
    insuranceCompanyId?: number;

    @ApiProperty({ example: 5000.0, description: 'Price of the insurance product' })
    @IsNotEmpty()
    @IsNumber()
    insurancePrice: number;

    @ApiProperty({ example: 10.5, description: 'Incentive percentage for the insurance product' })
    @IsNotEmpty()
    @IsNumber()
    incentivePercentage: number;

    @ApiProperty({ example: 12, description: 'Duration of the insurance product in months' })
    @IsNotEmpty()
    @IsNumber()
    durationMonths: number;

    @ApiProperty({ example: 6.00, description: 'payoutPercentage of the insurance' })
    @IsOptional()
    @IsNumber()
    payoutPercentage: number;

    @ApiProperty({ example: 'this is description', description: 'description of product' })
    @IsOptional()
    shortDescription?: string;

    @ApiProperty({ example: 'this is features', description: 'features of product' })
    @IsOptional()
    features?: string;

    @ApiProperty({ example: 'this is advantages', description: 'advantages of product' })
    @IsOptional()
    advantages?: string;

    @ApiProperty({ example: 'this is benefits', description: 'benefits of product' })   
    @IsOptional()
    benefits?: string;

    @ApiProperty({ example: true, description: 'Whether the insurance product is active or not', default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateInsuranceProductDto extends PartialType(CreateInsuranceProductDto) {}
