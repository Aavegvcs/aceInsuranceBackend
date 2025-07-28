import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Insurance_Product_Status } from 'src/utils/app.utils';

export class CreateInsurancePurchasedDto {
    @ApiProperty({ example: 'ABC123', description: 'Policy Number', required: false })
    @IsOptional()
    @IsString()
    policyNumber?: string;

    @ApiProperty({ example: 1, description: 'Client ID' })
    @IsNotEmpty()
    @IsNumber()
    insuranceUserId: number;

    @ApiProperty({ example: 1, description: 'agent ID' })
    @IsNumber()
    agentId: number;

    @ApiProperty({ example: 2, description: 'Insurance Product ID' })
    @IsNotEmpty()
    @IsNumber()
    productId: number;

    @ApiProperty({ example: 3, description: 'Insurance Ticket ID', required: false })
    @IsOptional()
    @IsNumber()
    ticketId?: number;

    @ApiProperty({ example: 50000.0, description: 'Insurance Amount', required: false })
    @IsOptional()
    @IsNumber()
    insuranceAmount?: number;

    @ApiProperty({ example: '2024-08-01', description: 'Purchased Date' })
    @IsNotEmpty()
    @IsDate()
    purchasedDate: Date;

    @ApiProperty({ example: '2025-08-01', description: 'Renewal Date' })
    @IsNotEmpty()
    @IsDate()
    renewalDate: Date;

    @ApiProperty({
        example: Insurance_Product_Status.ACTIVE,
        description: 'Product Status',
        enum: Insurance_Product_Status
    })
    @IsNotEmpty()
    @IsEnum(Insurance_Product_Status)
    insuranceType: Insurance_Product_Status;

    @ApiProperty({ example: 'Some remarks', description: 'Any additional remarks', required: false })
    @IsOptional()
    @IsString()
    anyRemarks?: string;

    @ApiProperty({ example: true, description: 'Is Active', default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateInsurancePurchasedDto extends PartialType(CreateInsurancePurchasedDto) {}
