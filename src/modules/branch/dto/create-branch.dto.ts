import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsArray } from 'class-validator';

export class CreateBranchDto {
    @ApiProperty({ description: 'Branch ID', example: 'BR001' })
    @IsString()
    @IsOptional()
    id: string;

    @ApiProperty({ description: 'Branch Name or Franchise Name', example: 'Downtown Branch' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'contact person Name', example: 'sam' })
    @IsString()
    @IsOptional()
    contactPerson?: string;

    @ApiProperty({
        description: 'Branch Model Type',
        example: 'BRANCH',
        enum: ['Branch', 'AP', 'Introducer']
    })
    @IsEnum(['Branch', 'AP', 'Introducer'])
    @IsNotEmpty()
    model: string;

    @ApiProperty({ description: 'Control Branch ID', example: 'BR123', required: false })
    @IsOptional()
    @IsString()
    controlBranchId?: string;

    @ApiProperty({ description: 'State ID', example: 5, required: false })
    @IsOptional()
    @IsNumber()
    stateId?: number;

    @IsOptional()
    @IsNumber()
    companyId?: number;

    @ApiProperty({ description: 'City Name', example: 'delhi', required: false })
    @IsOptional()
    @IsString()
    city?: string;

    @ApiProperty({ description: 'pincode', example: 12312, required: false })
    @IsOptional()
    @IsNumber()
    pincode?: number;

    @ApiProperty({ description: 'Branch Active Status', example: true, required: false })
    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @ApiProperty({ description: 'Segments of Business', example: ['Equities', 'Derivatives'], required: false })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    segments?: string[];

    @ApiProperty({ description: 'Email Address', example: 'branch@example.com', required: false })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiProperty({ description: 'Address', example: 'a-23 abc', required: false })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiProperty({ description: 'PAN number', example: 'afdsa2', required: false })
    @IsOptional()
    @IsString()
    panNumber?: string;


    @ApiProperty({ description: 'Phone Number', example: '+1234567890', required: false })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiProperty({ description: 'Activation Date', example: '2024-02-01T00:00:00.000Z', required: false })
    @IsOptional()
    activationDate?: Date;


    @ApiProperty({ description: 'Regional Manager ID', example: 3, required: false })
    @IsOptional()
    @IsString()
    regionalManagerId?: string;

    @ApiProperty({ description: 'Mapping Status', example: false, required: false })
    @IsOptional()
    @IsBoolean()
    mappingStatus?: boolean;

    @ApiProperty({ description: 'Sharing Percentage', example: 10.5, required: false })
    @IsOptional()
    @IsNumber()
    sharing?: number;

    @ApiProperty({ description: 'Number of Traded Clients', example: 100, required: false })
    @IsOptional()
    @IsNumber()
    noOfTraded?: number;

    @ApiProperty({ description: 'Equity Brokerage', example: 5000, required: false })
    @IsOptional()
    @IsNumber()
    equityBrokerage?: number;

    @ApiProperty({ description: 'Commodity Brokerage', example: 3000, required: false })
    @IsOptional()
    @IsNumber()
    commodityBrokerage?: number;

    @ApiProperty({ description: 'KYC Equity Count', example: 50, required: false })
    @IsOptional()
    @IsNumber()
    kycEquity?: number;

    @ApiProperty({ description: 'KYC Commodity Count', example: 30, required: false })
    @IsOptional()
    @IsNumber()
    kycCommodity?: number;

    @ApiProperty({ description: 'Terminals', example: ['Terminal1', 'Terminal2'], required: false })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    terminals?: string[];
}