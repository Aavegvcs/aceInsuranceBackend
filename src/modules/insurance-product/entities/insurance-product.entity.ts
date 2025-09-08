import { Branch } from '@modules/branch/entities/branch.entity';
import { Insurance_Type } from 'src/utils/app.utils';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn
} from 'typeorm';
import { InsuranceIncentives } from './insurance-incentives.entity';
import { InsuranceSubType } from './insurance-subtype.entity';
import { InsuranceCompanies } from '@modules/insurance-product/entities/insurance-companies.entity';
import { User } from '@modules/user/user.entity';
import { InsurancePurchasedProduct } from '@modules/insurance-product/entities/insurance-puchased-product.entity';
import { InsuranceProductSuggestions } from '@modules/insurance-escalation/entities/insurance-product-suggestions.entity';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';

@Entity({ name: 'insurance_product' })
export class InsuranceProduct {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'name', nullable: false })
    name: string;

    @Column({
        type: 'enum',
        enum: Insurance_Type,
        name: 'insurance_type',
        nullable: false
    })
    insuranceType: Insurance_Type;

    @ManyToOne(() => InsuranceSubType, (subtype) => subtype.product, { nullable: true })
    @JoinColumn({ name: 'insurance_subtype' })
    insuranceSubType: InsuranceSubType;

    // @ManyToOne(() => Branch, (branch) => branch.product, { nullable: false })
    // @JoinColumn({ name: 'branch_id' })
    // branchId: Branch;

    @ManyToOne(() => InsuranceCompanies, (company) => company.product, {
        nullable: false
    })
    @JoinColumn({ name: 'insurance_company_id' })
    insuranceCompanyId: InsuranceCompanies;

    @Column({
        name: 'insurance_price',
        type: 'decimal',
        precision: 10,
        scale: 2,
        nullable: false
    })
    insurancePrice: number;

    @Column({
        name: 'incentive_percentage',
        type: 'decimal',
        precision: 10,
        scale: 2,
        nullable: true
    })
    incentivePercentage: number;

    @Column({ name: 'duration_months', nullable: true })
    durationMonths: number;

    @Column({ name: 'short_description', type: 'text', nullable: true })
    shortDescription: string;

    @Column({ name: 'features', type: 'text', nullable: true })
    features: string;

    @Column({ name: 'advantages', type: 'text', nullable: true })
    advantages: string;

    @Column({ name: 'benefits', type: 'text', nullable: true })
    benefits: string;

    @Column({ name: 'payout_percentage', type: 'decimal', precision: 10, scale: 2, nullable: true })
    payoutPercentage: number;
    // added filed on 22-08-2025 @Aftab

    @Column({ name: 'coverage_amount_min', type: 'decimal', precision: 12, scale: 2, nullable: true })
    coverageAmountMin: number;

    @Column({ name: 'coverage_amount_max', type: 'decimal', precision: 12, scale: 2, nullable: true })
    coverageAmountMax: number;

    @Column({
        type: 'enum',
        enum: ['INDIVIDUAL', 'FAMILY', 'GROUP', 'VEHICLE'],
        name: 'coverage_type',
        nullable: true
    })
    coverageType: string;

    @Column({ name: 'is_renewable', type: 'boolean', default: true })
    isRenewable: boolean;

    @Column({ name: 'renewal_grace_period', type: 'int', default: 30 })
    renewalGracePeriod: number; //Extra days after policy expiry during which the policyholder can pay renewal premium without losing continuity benefits

    @Column({ name: 'waiting_period', type: 'int', nullable: true })
    waitingPeriods: number; //The minimum period (in days) after policy purchase before certain benefits/claims can be availed.

    @Column({ name: 'free_look_period_days', type: 'int', nullable: true })
    freeLookPeriodDays: number; //The number of days a policyholder has after buying the policy to cancel it and get a refund (usually 15–30 days).

    @Column({ name: 'eligibility_criteria', type: 'text', nullable: true })
    eligibilityCriteria: string; //Rules that define who can purchase the product (age, profession, location, etc.).

    @Column({ name: 'documents_required', type: 'text', nullable: true })
    documentsRequired: string; // Meaning: List of documents customer must provide for policy purchase or claim.

    @Column({ name: 'claim_process', type: 'text', nullable: true })
    claimProcess: string;

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

    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
    deletedAt: Date;

    @OneToMany(() => InsurancePurchasedProduct, (purchasedProduct) => purchasedProduct.productId)
    purchasedProduct: InsurancePurchasedProduct[];

    @OneToMany(() => InsuranceIncentives, (insuranceIncentives) => insuranceIncentives.productId)
    insuranceIncentives: InsuranceIncentives[];

    @OneToMany(() => InsuranceProductSuggestions, (data) => data.suggestedProducts)
    suggestedProducts: InsuranceProductSuggestions[];
}
