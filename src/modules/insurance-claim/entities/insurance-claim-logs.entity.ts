import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    ManyToOne,
    JoinColumn,
    UpdateDateColumn
} from 'typeorm';
import { InsuranceClaim } from '@modules/insurance-claim/entities/insurance-claim.entity';
import { User } from '@modules/user/user.entity';
import { Claim_Status } from 'src/utils/app.utils';

@Entity({ name: 'insurance_claim_logs' })
export class InsuranceClaimLogs {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => InsuranceClaim, (claim) => claim.claimLogs, { nullable: false })
    @JoinColumn({ name: 'claim_id' })
    claim: InsuranceClaim;

    @Column({ name: 'policy_number', type: 'text', nullable: true })
    policyNumber: string;

    @Column({ name: 'previous_status', type: 'enum', enum: Claim_Status, nullable: true })
    previousStatus: Claim_Status;

    @Column({ name: 'new_status', type: 'enum', enum: Claim_Status, nullable: false })
    newStatus: Claim_Status;

    @Column({ name: 'log_details', type: 'json', nullable: false })
    logDetails: object;

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
}
