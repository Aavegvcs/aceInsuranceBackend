import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsBoolean, IsString } from 'class-validator';
import { Insurance_Type } from 'src/utils/app.utils';

export class CreateInsuranceSubTypeDto {
    @ApiProperty({ example: 'Health Plan A', description: 'Name of the insurance sub-type', required: false })
    @IsOptional()
    @IsString()
    insuranceSubType?: string;

    @ApiProperty({ example: Insurance_Type.Health, description: 'Type of insurance', enum: Insurance_Type })
    @IsNotEmpty()
    @IsEnum(Insurance_Type)
    insuranceType: Insurance_Type;

    @ApiProperty({ example: true, description: 'Whether the sub-type is active', default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateInsuranceSubTypeDto extends PartialType(CreateInsuranceSubTypeDto) {
    @ApiProperty({ example: 1, description: 'Unique ID of the insurance sub-type' })
    @IsNotEmpty()
    id: number;
}
