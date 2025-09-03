import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
    OneToOne
} from 'typeorm';
import { InsuranceUser } from '@modules/insurance-ticket/entities/insurance-user.entity';
import { InsuranceProduct } from '@modules/insurance-product/entities/insurance-product.entity';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
// import { InsuranceClaim } from '@modules/insurance-claim/entities/insurance-claim.entity';
import { User } from '@modules/user/user.entity';
import { InsuranceCompanies } from '@modules/insurance-product/entities/insurance-companies.entity';
import { Insurance_Type, Policy_Status } from 'src/utils/app.utils';
import { InsurancePolicyRenewalHistory } from './insurance-policy-renewal-history.entity';
import { InsuranceClaim } from '@modules/insurance-claim/entities/insurance-claim.entity';

@Entity({ name: 'insurance_policy' })
export class InsurancePolicy {
    @PrimaryGeneratedColumn()
    id: number;

    // 👇 The ticket that created this policy (first purchase)
    @ManyToOne(() => InsuranceTicket, { nullable: true })
    @JoinColumn({ name: 'original_ticket_id' })
    originalTicket: InsuranceTicket;

    @ManyToOne(() => InsuranceTicket, { nullable: true })
    @JoinColumn({ name: 'current_ticket_id' })
    currentTicket: InsuranceTicket;

    @ManyToOne(() => InsuranceUser, { nullable: false })
    @JoinColumn({ name: 'insurance_user_id' })
    insuranceUser: InsuranceUser;

    @ManyToOne(() => InsuranceCompanies, { nullable: false })
    @JoinColumn({ name: 'insurance_company_id' })
    insuranceCompany: InsuranceCompanies;

    @ManyToOne(() => InsuranceProduct, { nullable: false })
    @JoinColumn({ name: 'insurance_product_id' })
    insuranceProduct: InsuranceProduct;

    @Column({ name: 'policy_number', nullable: false })
    policyNumber: string;

    @Column({ type: 'enum', enum: Insurance_Type, name: 'policy_type', nullable: true })
    policyType: Insurance_Type; // e.g. Health, Motor, Life

    @Column({ type: 'decimal', precision: 12, scale: 2, name: 'sum_assured', nullable: true })
    sumAssured: number; // basically it is the coverage amount

    @Column({ type: 'decimal', precision: 12, scale: 2, name: 'premium_amount', nullable: true })
    premiumAmount: number;

    @Column({ type: 'date', name: 'start_date', nullable: true })
    startDate: Date;

    @Column({ type: 'date', name: 'end_date', nullable: true })
    endDate: Date;

    @Column({ name: 'status', type: 'enum', enum: Policy_Status, default: 'ACTIVE' })
    status: Policy_Status; // ACTIVE, LAPSED, EXPIRED, CANCELLED

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @Column({ name: 'is_renewal', type: 'boolean', default: true })
    isRenewal: boolean;

    @Column({ name: 'renewed_date', type: 'timestamp', nullable:true })
    renewedDate: Date;

    // @OneToMany(() => InsuranceClaim, (claim) => claim.policy, { nullable: true })
    // claims: InsuranceClaim[];

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

    // 👇 All tickets linked to this policy (first + renewals)
    @OneToMany(() => InsuranceTicket, (ticket) => ticket.policy, { nullable: true })
    tickets: InsuranceTicket[];

    @OneToMany(() => InsurancePolicyRenewalHistory, (renewal) => renewal.policy, { nullable: true })
    renewals: InsurancePolicyRenewalHistory[];
    
    @OneToMany(() => InsuranceClaim, (renewal) => renewal.policy, { nullable: true })
    claims: InsuranceClaim[];
}
