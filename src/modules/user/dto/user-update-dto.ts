import { ApiProperty } from '@nestjs/swagger';
// DTO is data transfer object
export class UserUpdateDto {
    @ApiProperty({
        description: 'First Name of User',
        example: 'kinze '
    })
    firstName: string;

    @ApiProperty({
        description: 'Middle Name of User',
        example: 'Mid'
    })
    middleName: string;

    @ApiProperty({
        description: 'Last Name of User',
        example: 'jay'
    })
    lastName: string;

    @ApiProperty({
        description: 'Type of Tax-Id',
        example: 'SSN'
    })
    taxIdType: string;

    @ApiProperty({
        description: 'Social Security Number of User',
        example: '778-62-8144'
    })
    taxIdNumber: string;

    @ApiProperty({
        description: 'Provide NPI',
        example: 'Provide NPI'
    })
    providerNpi: string;

    @ApiProperty({
        description: 'Provider License',
        example: 'Provider License'
    })
    providerLicense: string;

    @ApiProperty({
        description: 'DEA Number',
        example: 'F91234563'
    })
    deaNumber: string;

    @ApiProperty({
        description: 'phoneNumber of User',
        example: '+123986394'
    })
    phoneNumber: string;

    @ApiProperty({
        description: 'Default state',
        example: 4338
    })
    defaultLocation: number;

    @ApiProperty({
        description: 'logo',
        example: 'logo'
    })
    logo: string;
}
