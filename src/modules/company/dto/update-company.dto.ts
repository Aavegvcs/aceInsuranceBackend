import { ApiProperty } from '@nestjs/swagger';

// DTO is data transfer object
export class CompanyUpdateDto {
    id: number;

    @ApiProperty({
        description: 'Company Name',
        example: 'ITS'
    })
    companyName: string;

    @ApiProperty({
        description: 'Practice Website',
        example: 'website.com'
    })
    practiceWebsite: string;

    @ApiProperty({
        description: 'Site Shortname',
        example: 'its'
    })
    siteShortName: string;

    @ApiProperty({
        description: 'Company Logo',
        example: 'company logo'
    })
    companyLogo: string;

    @ApiProperty({
        description: 'Legal Name',
        example: 'ITS'
    })
    legalName: string;

    @ApiProperty({
        description: 'Country',
        example: 4438
    })
    country: number;

    @ApiProperty({
        description: 'Timezone',
        example: 'Central Standard Time'
    })
    timezone: string;

    @ApiProperty({
        description: 'Date Format',
        example: 'MM:DD:YYYY'
    })
    dateFormat: string;

    @ApiProperty({
        description: 'Default Biling Place of Service',
        example: 'USA'
    })
    defaultBillingPlaceOfService: string;

    @ApiProperty({
        description: 'Business Associate Agreement File (pdf, doc)',
        example: 'Upload file (pdf,doc)'
    })
    businessAssociateAgreementFile: string;

    @ApiProperty({
        description: 'Bill Client BY',
        example: 'bank Name'
    })
    billClientBy: string;

    @ApiProperty({
        description: 'Tax ID Type',
        example: ' SSN'
    })
    taxIdType: string;

    @ApiProperty({
        description: 'Tax ID',
        example: ' 1'
    })
    taxId: string;

    @ApiProperty({
        description: 'Business Type',
        example: 'Foreign'
    })
    businessType: string;

    @ApiProperty({
        description: 'Company Type',
        example: ' SSN'
    })
    companyType: string;

    @ApiProperty({
        description: 'License Number',
        example: ' 123-CTB'
    })
    licenseNumber: string;

    @ApiProperty({
        description: 'Currency',
        example: ' $ , PKR'
    })
    currency: string;

    @ApiProperty({
        description: 'Diagnostic Code',
        example: '1-CSR'
    })
    diagnosticCode: string;

    @ApiProperty({
        description: 'OrganizationNPI',
        example: ' organization npi'
    })
    organizationNPI: string;

    @ApiProperty({
        description: 'FacilityNPI',
        example: ' facility npi'
    })
    facilityNPI: string;

    @ApiProperty({
        description: 'City',
        example: 4438
    })
    city: number;

    @ApiProperty({
        description: 'State',
        example: 4438
    })
    state: number;

    @ApiProperty({
        description: 'Zip',
        example: ' 4657-YHU'
    })
    zip: string;

    @ApiProperty({
        description: 'Phone Number',
        example: ' 675879'
    })
    phoneNumber: string;

    @ApiProperty({
        description: 'Secondary Phone Number',
        example: ' 675879'
    })
    secondaryPhoneNumber: string;

    @ApiProperty({
        description: 'Fax Number',
        example: ' 675879'
    })
    fax: string;

    @ApiProperty({
        description: 'address',
        example: ' 675879'
    })
    address: string;

    @ApiProperty({
        description: 'created By',
        example: ' created by logged in user Id'
    })
    createdBy: string;

    @ApiProperty({
        description: 'status',
        example: ' active / inactive'
    })
    status: string;
}
