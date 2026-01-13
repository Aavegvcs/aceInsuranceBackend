import { InsurancePolicy } from '@modules/insurance-policy/entities/insurance-policy.entity';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { User } from '@modules/user/user.entity';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';

@Entity('insurance_endorsement')
export class InsuranceEndorsement {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => InsurancePolicy)
    policy: InsurancePolicy;

    @ManyToOne(() => InsuranceTicket)
    ticket: InsuranceTicket;

    @Column({ type: 'json' })
    selectedFields: string[];

    @Column({ type: 'json' })
    endorsementData: any;

    @Column({ default: false })
    isPaymentRequired: boolean;

    @Column({ default: 'NOT_REQUIRED' })
    paymentStatus: string;

    @Column({ default: 'PENDING' })
    approvalStatus: string;

    @Column({ default: 'OPEN' })
    status: string;

    @Column({ default: true })
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

    @ManyToOne(() => User, { nullable: true })
    approvedBy: User;

    @Column({ nullable: true })
    approvedAt: Date;

    @Column({ nullable: true })
    finalizedAt: Date;
}
