import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany
} from 'typeorm';
import { InsurancePolicy } from '@modules/insurance-policy/entities/insurance-policy.entity';
import { InsuranceUser } from '@modules/insurance-ticket/entities/insurance-user.entity';
import { User } from '@modules/user/user.entity';
import { Claim_Final_Status, Claim_Status, Claim_Type } from 'src/utils/app.utils';
import { InsuranceClaimLogs } from './insurance-claim-logs.entity';

@Entity({ name: 'insurance_claim' })
export class InsuranceClaim {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => InsurancePolicy, (policy) => policy.claims, { nullable: true })
    @JoinColumn({ name: 'policy_id' })
    policy: InsurancePolicy;

    @Column({ name: 'policy_number', type: 'varchar', length: 255, nullable: true })
    policyNumber: string;

    @ManyToOne(() => InsuranceUser, { nullable: true })
    @JoinColumn({ name: 'insurance_user_id' })
    insuranceUser: InsuranceUser;

    @Column({ name: 'incident_date', type: 'date', nullable: false })
    incidentDate: Date;

    @Column({ name: 'incident_place', type: 'varchar', length: 255, nullable: true })
    incidentPlace: string;

    @Column({ name: 'incident_description', type: 'text', nullable: true })
    incidentDescription: string;

    @Column({ name: 'claim_type', type: 'enum', enum: Claim_Type, nullable: false })
    claimType: Claim_Type;

    @Column({ name: 'claim_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
    claimAmount: number;

    @Column({ name: 'settlement_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
    settlementAmount: number;

    @Column({ name: 'insurance_claim_number', type: 'varchar', length: 100, nullable: true })
    insuranceClaimNumber: string; // claim number given by insurance company

    @Column({ name: 'status', type: 'enum', enum: Claim_Status, default: Claim_Status.REGISTERED })
    status: Claim_Status;

    @Column({ name: 'final_status', type: 'enum', enum: Claim_Final_Status, default: Claim_Final_Status.PENDING })
    finalStatus: Claim_Final_Status;

    @Column({ type: 'json', name: 'documents', nullable: true })
    documents: any;

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

    @OneToMany(() => InsuranceClaimLogs, (logs) => logs.claim)
    claimLogs: InsuranceClaimLogs[];
}
