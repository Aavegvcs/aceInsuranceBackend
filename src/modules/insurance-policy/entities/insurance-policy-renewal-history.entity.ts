import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { InsurancePolicy } from './insurance-policy.entity';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { User } from '@modules/user/user.entity';

@Entity({ name: 'insurance_policy_renewal_history' })
export class InsurancePolicyRenewalHistory {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => InsurancePolicy, (policy) => policy.renewals, { nullable: false })
    @JoinColumn({ name: 'policy_id' })
    policy: InsurancePolicy;

    @ManyToOne(() => InsuranceTicket, { nullable: true })
    @JoinColumn({ name: 'original_ticket_id' })
    originalTicket: InsuranceTicket;

    @ManyToOne(() => InsuranceTicket, { nullable: true })
    @JoinColumn({ name: 'previous_ticket_id' })
    previousTicket: InsuranceTicket;

     @ManyToOne(() => InsuranceTicket, { nullable: true })
    @JoinColumn({ name: 'current_ticket_id' })
    currentTicket: InsuranceTicket;

    @Column({ type: 'date', name: 'old_start_date', nullable: true })
    oldStartDate: Date;

    @Column({ type: 'date', name: 'old_end_date', nullable: true })
    oldEndDate: Date;

    @Column({ type: 'date', name: 'new_start_date', nullable: true })
    newStartDate: Date;

    @Column({ type: 'date', name: 'new_end_date', nullable: true })
    newEndDate: Date;

    @Column({ type: 'decimal', precision: 12, scale: 2, name: 'privious_coveraged_amount', nullable: true })
    previousCoveragedAmount: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, name: 'current_coveraged_amount', nullable: true })
    currentCoveragedAmount: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, name: 'privious_premium_amount', nullable: true })
    previousPremiumAmount: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, name: 'current_premium_amount', nullable: true })
    currentPremiumAmount: number;

    @CreateDateColumn({ name: 'renewal_date', type: 'timestamp', nullable:true })
    renewalDate: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    createdBy: User;
    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;
}
