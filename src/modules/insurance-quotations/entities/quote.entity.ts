import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    OneToOne,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn
} from 'typeorm';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { User } from '@modules/user/user.entity';
import { InsuranceQuotation } from './insurance-quotation.entity';
import { InsuranceProduct } from '@modules/insurance-product/entities/insurance-product.entity';
import { InsuranceCompanies } from '@modules/insurance-product/entities/insurance-companies.entity';

@Entity({ name: 'quote_entity' })
export class QuoteEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => InsuranceQuotation, (data) => data.quotes)
    @JoinColumn({ name: 'quotation_id' })
    quotationId: InsuranceQuotation;

    
    @ManyToOne(() => InsuranceCompanies, { nullable: false })
    @JoinColumn({ name: 'company_id' })
    company: InsuranceCompanies;

    @ManyToOne(() => InsuranceProduct, { nullable: false })
    @JoinColumn({ name: 'product_id' })
    product: InsuranceProduct;

    @Column({ name: 'company_logo', nullable: true })
    companyLogo: string;

    @Column({ type: 'decimal', name: 'coveraged_required', precision: 10, scale: 2, nullable: true })
    coveragedRequired: number;

    @Column({ type: 'decimal', name: 'Premium', precision: 10, scale: 2, nullable: true })
    Premium: number;

    @Column({ type: 'decimal', name: 'ncb', precision: 10, scale: 2, nullable: true })
    ncb: number; // no claim bonus(%)

    @Column({ name: 'coverage_included', nullable: true })
    coverageIncluded: string;
    
    @Column({ name: 'idv', nullable: true })
    idv: string;

    @Column({ name: 'coverage_type', nullable: true })
    coverageType: string;


    @Column({ name: 'features', nullable: true })
    features: string;

    @Column({ name: 'advantages', nullable: true })
    advantages: string;

    @Column({ name: 'benefits', nullable: true })
    benefits: string;
    
    @Column({ name: 'shortDescription', nullable: true })
    shortDescription: string;

    @Column({ name: 'additional_remarks', nullable: true })
    additionalRemarks: string;

    // @Column()
    // validityDate: Date;

    // @Column({
    //     type: 'enum',
    //     enum: ['DRAFT', 'REVIEWED', 'SENT', 'EXPIRED'],
    //     default: 'DRAFT'
    // })
    // status: string;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    createdBy: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'updated_by' })
    updatedBy: User;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;
}
