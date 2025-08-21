import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateInsuranceCompanyDto {
    @ApiProperty({ example: 'ABC Insurance', description: 'Name of the insurance company' })
    @IsNotEmpty()
    @IsString()
    companyName: string;

    @ApiProperty({ example: '123 Street, City', description: 'Address of the insurance company', required: false })
    @IsOptional()
    @IsString()
    companyAddress?: string;

    @ApiProperty({ example: 'John Doe', description: "Contact person's name", required: false })
    @IsOptional()
    @IsString()
    contactPerson?: string;

    @ApiProperty({ example: '9876543210', description: 'Contact number of the insurance company' })
    @IsNotEmpty()
    @IsString()
    contactNumber: string;

    @ApiProperty({ example: 'abc@example.com', description: 'Email of the insurance company' })
    @IsOptional()
    @IsEmail()
    email: string;


    @ApiProperty({ example: 'John Doe', description: "Contact person's name", required: false })
    @IsOptional()
    @IsString()
    secondaryContactPerson?: string;

    @ApiProperty({ example: '9876543210', description: 'Secondary Contact number of escalation' })
    @IsNotEmpty()
    @IsString()
    secondaryContactNumber: string;

    @ApiProperty({ example: 'abc@example.com', description: 'Secondary Email for escalation' })
    @IsNotEmpty()
    @IsEmail()
    secondaryEmail: string;

    @ApiProperty({ example: true, description: 'Whether the company is active or not', default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateInsuranceCompanyDto extends PartialType(CreateInsuranceCompanyDto) {}
