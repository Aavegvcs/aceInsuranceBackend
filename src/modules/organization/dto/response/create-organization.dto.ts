import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from '@nestjs/class-validator';
export class CreateOrganizationDto {
    @ApiProperty({
        description: 'First Name of User',
        example: 'kinze '
    })
    @IsNotEmpty()
    orgName: string;

    @ApiProperty({
        description: 'First Name of User',
        example: 'kinze '
    })
    @IsNotEmpty()
    website: string;

    @ApiProperty({
        description: 'First Name of User',
        example: 'kinze '
    })
    @IsNotEmpty()
    timezone: string;

    @ApiProperty({
        description: 'First Name of User',
        example: 'kinze '
    })
    @IsNotEmpty()
    tax: string;

    @ApiProperty({
        description: 'First Name of User',
        example: 'kinze '
    })
    @IsNotEmpty()
    logo: string;

    @ApiProperty({
        description: 'First Name of User',
        example: 'kinze '
    })
    @IsNotEmpty()
    currency: string;

    @ApiProperty({
        description: 'siteShortName',
        example: ' siteShortName'
    })
    siteShortName: string;

    @ApiProperty({
        description: 'legalName',
        example: ' legalName'
    })
    legalName: string;

    @ApiProperty({
        description: 'dateFormat',
        example: ' dateFormat mm-dd-yyyy'
    })
    dateFormat: string;

    @ApiProperty({
        description: 'phone',
        example: ' phone'
    })
    phone: string;

    @ApiProperty({
        description: 'secondaryPhone',
        example: ' secondaryPhone'
    })
    secondaryPhone: string;
}
