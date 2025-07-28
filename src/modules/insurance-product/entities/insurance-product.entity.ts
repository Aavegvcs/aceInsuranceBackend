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
        nullable: false
    })
    incentivePercentage: number;

    @Column({ name: 'duration_months', nullable: false })
    durationMonths: number;

    @Column({ name: 'short_description', type: 'text', nullable: true })
    shortDescription: string;

    @Column({ name: 'features', type: 'text', nullable: true })
    features: string;

    @Column({ name: 'advantages', type: 'text', nullable: true })
    advantages: string;

    @Column({ name: 'benefits', type: 'text', nullable: true })
    benefits: string;

    @Column({ name: 'payout_percentage', type: 'decimal', precision: 10, scale: 2, nullable: false })
    payoutPercentage: number;

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

    @DeleteDateColumn({ name:'deleted_at', type: 'timestamp', nullable: true })
    deletedAt: Date;

    @OneToMany(() => InsurancePurchasedProduct, (purchasedProduct) => purchasedProduct.productId)
    purchasedProduct: InsurancePurchasedProduct[];

    @OneToMany(() => InsuranceIncentives, (insuranceIncentives) => insuranceIncentives.productId)
    insuranceIncentives: InsuranceIncentives[];

    @OneToMany(() => InsuranceProductSuggestions, (data) => data.suggestedProducts)
    suggestedProducts: InsuranceProductSuggestions[];
}
