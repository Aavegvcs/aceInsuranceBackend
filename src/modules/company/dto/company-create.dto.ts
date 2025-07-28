import { Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

// DTO is data transfer object
export class CompanyCreateDto {
    @ApiProperty({
        description: 'Company Name',
        example: 'ITS'
    })
    @Column({
        unique: true
    })
    companyName: string;

    @ApiProperty({
        description: 'Practice Website',
        example: 'website.com'
    })
    @Column({ nullable: true })
    practiceWebsite: string;

    @ApiProperty({
        description: 'Site Shortname',
        example: 'its'
    })
    @Column({ nullable: true })
    siteShortName: string;

    @ApiProperty({
        description: 'Legal Name',
        example: 'ITS'
    })
    @Column({ nullable: true })
    legalName: string;

    @ApiProperty({
        description: 'Country',
        example: 4438
    })
    @Column({ nullable: true })
    country: number;

    @ApiProperty({
        description: 'Timezone',
        example: 'Central Standard Time'
    })
    @Column({ nullable: true })
    timezone: string;

    @ApiProperty({
        description: 'Date Format',
        example: 'MM:DD:YYYY'
    })
    @Column({ nullable: true })
    dateFormat: string;

    // @ApiProperty({
    //   description: 'Default Biling Place of Service',
    //   example: 'USA',
    // })
    // @Column({ nullable: true})
    // defaultBillingPlaceOfService: string;

    // @ApiProperty({
    //   description: 'Business Associate Agreement File (pdf, doc)',
    //   example: 'Upload file (pdf,doc)',
    // })
    // @Column({ nullable: true})
    // businessAssociateAgreementFile: string;

    // @ApiProperty({
    //   description: 'Bill Client BY',
    //   example: 'bank Name',
    // })
    // @Column({ nullable: true})
    // billClientBy: string;

    // @ApiProperty({
    //   description: 'Tax ID Type',
    //   example: ' SSN',
    // })
    // @Column({ nullable: true})
    // taxIdType: string;

    // @ApiProperty({
    //   description: 'Tax ID',
    //   example: ' 1',
    // })
    // @Column({ nullable: true})
    // taxId: string;

    // @ApiProperty({
    //   description: 'Business Type',
    //   example: 'Foreign',
    // })
    // @Column({ nullable: true})
    // businessType: string;

    // @ApiProperty({
    //   description: 'Company Type',
    //   example: ' SSN',
    // })
    // @Column({ nullable: true})
    // companyType: string;

    // @ApiProperty({
    //   description: 'License Number',
    //   example: ' 123-CTB',
    // })
    // @Column({ nullable: true})
    // licenseNumber: string;

    @ApiProperty({
        description: 'Currency',
        example: ' $ , PKR'
    })
    @Column({ nullable: true })
    currency: string;

    // @ApiProperty({
    //   description: 'Diagnostic Code',
    //   example: '1-CSR',
    // })
    // @Column({ nullable: true})
    // diagnosticCode: string;

    // @ApiProperty({
    //   description: 'OrganizationNPI',
    //   example: ' organization npi',
    // })
    // @Column({ nullable: true})
    // organizationNPI: string;

    // @ApiProperty({
    //   description: 'FacilityNPI',
    //   example: ' facility npi',
    // })
    // @Column({ nullable: true})
    // facilityNPI: string;

    @ApiProperty({
        description: 'City',
        example: 4438
    })
    @Column({ nullable: true })
    city: number;

    @ApiProperty({
        description: 'State',
        example: 4438
    })
    @Column({ nullable: true })
    state: number;

    @ApiProperty({
        description: 'Zip',
        example: ' 4657-YHU'
    })
    @Column({ nullable: true })
    zip: string;

    @ApiProperty({
        description: 'Phone Number',
        example: ' 675879'
    })
    @Column({ nullable: true })
    phoneNumber: string;

    @ApiProperty({
        description: 'Secondary Phone Number',
        example: ' 675879'
    })
    @Column({ nullable: true })
    secondaryPhoneNumber: string;

    @ApiProperty({
        description: 'Fax Number',
        example: ' 675879'
    })
    @Column({ nullable: true })
    fax: string;

    @ApiProperty({
        description: 'address',
        example: ' 675879'
    })
    @Column({ nullable: true })
    address: string;

    @ApiProperty({
        description: 'Company Logo',
        example: ' company logo'
    })
    @Column({ nullable: true })
    companyLogo: string;

    @ApiProperty({
        description: 'created By',
        example: ' created by logged in user Id'
    })
    @Column({ nullable: false })
    createdBy: string;

    @ApiProperty({
        description: 'status',
        example: ' active / inactive'
    })
    @Column({ nullable: false })
    status: string;
}
