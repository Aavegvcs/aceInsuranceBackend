// src/modules/client/dto/create-client.dto.ts
import {
    IsNumber,
    IsOptional,
    IsString,
    IsBoolean,
    IsDate,
    IsNotEmpty,
    ValidateNested,
    IsEmail,
    IsArray,
    IsEnum
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Define an enum for gender to ensure valid values
enum Gender {
    Male = 'Male',
    Female = 'Female'
}

// Define an enum for status to ensure valid values
enum ClientStatus {
    Active = 'active',
    Inactive = 'inactive'
}

export class CreateClientDto {
    @ApiProperty({
        description: 'Unique identifier for the client',
        example: 'CL001',
        required: true
    })
    @IsNotEmpty()
    @IsString()
    clientId: string;

    @ApiProperty({
        description: 'ID of the branch the client belongs to',
        example: 'AD01',
        required: true
    })
    @IsNotEmpty()
    @IsString()
    branchId: string;

    @ApiProperty({
        description: 'region branch ID of the branch the client belongs to',
        example: 'AD01',
        required: true
    })
    @IsOptional()
    @IsString()
    regionBranchCode?: string;

    @ApiProperty({
        description: 'Phone number of the client',
        example: '9876543210',
        required: false
    })
    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @ApiProperty({
        description: 'Email address of the client',
        example: 'john@ex.com',
        required: true
    })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'First name of the client',
        example: 'John',
        required: true
    })
    @IsNotEmpty()
    @IsString()
    firstName: string;

    @ApiProperty({
        description: 'Middle name of the client',
        example: 'Michael',
        required: false
    })
    @IsOptional()
    @IsString()
    middleName?: string;

    @ApiProperty({
        description: 'Last name of the client',
        example: 'Doe',
        required: true
    })
    @IsNotEmpty()
    @IsString()
    lastName: string;

    @ApiProperty({
        description: 'Date of birth of the client',
        example: '1990-01-01',
        required: false
    })
    @IsOptional()
    @IsDate()
    dateOfBirth?: Date;

    @ApiProperty({
        description: 'Gender of the client',
        example: 'Male',
        enum: Gender,
        required: false
    })
    @IsOptional()
    @IsEnum(Gender)
    gender?: Gender;

    @ApiProperty({
        description: 'Array of address lines for the client',
        example: ['123 Main St', 'Apt 4B'],
        required: false
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    addresses?: string[];

    @ApiProperty({ description: 'State ID', example: 5, required: false })
    @IsOptional()
    @IsNumber()
    stateId?: number;

    @ApiProperty({ description: 'City Name', example: 'delhi', required: false })
    @IsOptional()
    @IsString()
    cityName?: string;

    @ApiProperty({
        description: 'Country of the client',
        example: 'India',
        required: true
    })
    @IsNotEmpty()
    @IsNumber()
    countryId: number;

    @ApiProperty({
        description: 'Zip code of the client',
        example: '380001',
        required: true
    })
    @IsNotEmpty()
    @IsString()
    zip: string;

    @ApiProperty({
        description: 'Status of the client',
        example: 'active',
        enum: ClientStatus,
        required: true
    })
    @IsNotEmpty()
    @IsEnum(ClientStatus)
    status: ClientStatus;

    @ApiProperty({
        description: 'PAN number of the client',
        example: 'ABCDE1234F',
        required: true
    })
    @IsNotEmpty()
    @IsString()
    panNumber: string;

    @ApiProperty({
        description: 'Depository Participant ID of the client',
        example: 'DP123456',
        required: false
    })
    @IsOptional()
    @IsString()
    dpId?: string;

    @ApiProperty({
        description: 'Activation date of the client',
        example: '2023-01-01',
        required: true
    })
    @IsOptional()
    @IsDate()
    clientActivationDate?: Date;

    @ApiProperty({
        description: 'Activation date of the client',
        example: '2023-01-01',
        required: true
    })
    @IsOptional()
    @IsDate()
    clientReactivationDate?: Date;

    @ApiProperty({
        description: 'Type of bank account',
        example: 'Savings',
        required: false
    })
    @IsOptional()
    @IsString()
    bankAccountType?: string;

    @ApiProperty({
        description: 'Bank account number',
        example: '1234567890',
        required: false
    })
    @IsOptional()
    @IsString()
    bankAccountNumber?: string;

    @ApiProperty({
        description: 'IFSC code of the bank',
        example: 'SBIN0001234',
        required: false
    })
    @IsOptional()
    @IsString()
    bankIfscCode?: string;

    @ApiProperty({
        description: 'Name of the bank',
        example: 'State Bank of India',
        required: false
    })
    @IsOptional()
    @IsString()
    bankName?: string;

    @ApiProperty({
        description: 'Whether the client is online',
        example: false,
        required: false
    })
    @IsOptional()
    @IsBoolean()
    online?: boolean;

    @ApiProperty({
        description: 'Mapping status of the client',
        example: false,
        required: false
    })
    @IsOptional()
    @IsBoolean()
    mappingStatus?: boolean;

    @ApiProperty({
        description: 'Family group of the client',
        example: 'GroupA',
        required: false
    })
    @IsOptional()
    @IsString()
    familyGroup?: string;

    @ApiProperty({
        description: 'ID of the company the client belongs to',
        example: 1,
        required: true
    })
    @IsNotEmpty()
    @IsNumber()
    companyId: number;

    defaultBank?: boolean;

    bankActive?: boolean;
}
