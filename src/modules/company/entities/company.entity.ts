import { Branch } from '@modules/branch/entities/branch.entity';
import { ApiProperty } from '@nestjs/swagger';
import { City } from 'src/modules/cities/entities/city.entity';
import { Country } from 'src/modules/countries/entities/country.entity';
import { State } from 'src/modules/states/entities/state.entity';
import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    BeforeInsert,
    OneToMany,
    ManyToOne,
    JoinColumn
} from 'typeorm';

@Entity({ name: 'company' })
export class Company extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        name: 'company_code',
        unique: true,
        nullable: false
    })
    companyCode: string;

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
        description: 'Timezone',
        example: 'Central Standard Time'
    })
    @Column({ nullable: true })
    timezone: string;

    @ApiProperty({
        description: 'Company Logo',
        example: 'ITS Company Logo'
    })
    @Column({
        unique: true
    })
    companyLogo: string;

    @ApiProperty({
        description: 'Date Format',
        example: 'MM:DD:YYYY'
    })
    @Column({ nullable: true })
    dateFormat: string;

    @ApiProperty({
        description: 'Currency',
        example: ' $ , PKR'
    })
    @Column({ nullable: true })
    currency: string;

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
        description: 'created By',
        example: ' created by logged in user Id'
    })
 

    @ApiProperty({
        description: 'is_active'
    })
    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @Column({ nullable: true })
    address: string;

    @ManyToOne(() => Country)
    @JoinColumn({ name: 'country' })
    country: Country;

    @ManyToOne(() => City)
    @JoinColumn({ name: 'city' })
    city: City;

    @ManyToOne(() => State)
    @JoinColumn({ name: 'state' })
    state: State;

    @Column({ nullable: true })
    fax: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    sebiRegnNo: string;

    @Column({ nullable: true })
    nsdlRegnNo: string;

    @Column({ nullable: true })
    cdslRegnNo: string;

    @Column({ nullable: true })
    CIN: string;

    @Column({ nullable: true })
    cdslDpId: string;

    @Column({ nullable: true })
    nsdlDpId: string;

    @Column({ nullable: true })
    zip: string;

    @CreateDateColumn({ type: 'timestamp', default: null, nullable: true })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;

    @BeforeInsert()
    updateTimestamps() {
        this.createdAt = new Date(Date.now());
    }
   @Column({ nullable: true })
    createdBy: number;

    @ApiProperty({
        description: 'created By',
        example: ' created by logged in user Id'
    })
    @Column({ nullable: true })
    updatedBy: number;
    
    @OneToMany(() => Branch, (data) => data.company, { nullable: true })
    branch: Branch[];
}
