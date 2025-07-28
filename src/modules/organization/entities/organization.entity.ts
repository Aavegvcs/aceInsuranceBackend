import { ApiProperty } from '@nestjs/swagger';
import {
    BeforeInsert,
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';
import { IsNotEmpty } from '@nestjs/class-validator';
@Entity({ name: 'organization' })
export class Organization {
    @PrimaryGeneratedColumn()
    id: number;
    @ApiProperty({
        description: 'Name of Organization',
        example: 'its '
    })
    @IsNotEmpty()
    @Column()
    orgName: string;

    @ApiProperty({
        description: 'Website of Organization',
        example: 'www '
    })
    @IsNotEmpty()
    @Column()
    website: string;

    @ApiProperty({
        description: 'timezone of Organization',
        example: 'kinze '
    })
    @IsNotEmpty()
    @Column()
    timezone: string;

    @ApiProperty({
        description: 'tax of Organization',
        example: 'kinze '
    })
    @IsNotEmpty()
    @Column()
    tax: string;

    @ApiProperty({
        description: 'logo of Organization',
        example: 'kinze '
    })
    @IsNotEmpty()
    @Column()
    logo: string;

    @ApiProperty({
        description: 'currency of Organization',
        example: 'USD '
    })
    @IsNotEmpty()
    @Column()
    currency: string;

    @ApiProperty({
        description: 'siteShortName',
        example: ' siteShortName'
    })
    @Column({ nullable: false })
    siteShortName: string;

    @ApiProperty({
        description: 'legalName',
        example: ' legalName'
    })
    @Column({ nullable: false })
    legalName: string;

    @ApiProperty({
        description: 'dateFormat',
        example: ' dateFormat mm-dd-yyyy'
    })
    @Column({ nullable: false })
    dateFormat: string;

    @ApiProperty({
        description: 'phone',
        example: ' phone'
    })
    @Column({ nullable: false })
    phone: string;

    @ApiProperty({
        description: 'secondaryPhone',
        example: ' secondaryPhone'
    })
    @Column({ nullable: false })
    secondaryPhone: string;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    country: string;

    @Column({ nullable: true })
    city: string;

    @Column({ nullable: true })
    state: string;

    @Column({ nullable: true })
    fax: string;

    @Column({ nullable: true })
    zip: string;

    @CreateDateColumn({ type: 'timestamp', default: null, nullable: true })
    createdAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)'
    })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;

    @BeforeInsert()
    updateTimestamps() {
        this.createdAt = new Date(Date.now());
    }
}
