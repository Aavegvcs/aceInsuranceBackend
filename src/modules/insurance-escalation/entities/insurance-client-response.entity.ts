import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    ManyToOne,
    JoinColumn,
    UpdateDateColumn,
    DeleteDateColumn
} from 'typeorm';
import { InsuranceEscalations } from './insurance-escalations.entity';
import { User } from '@modules/user/user.entity';

@Entity({ name: 'insurance_client_responses' })
export class InsuranceClientResponses {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => InsuranceEscalations)
    @JoinColumn({ name: 'escalation_id' })
    escalation: InsuranceEscalations;

    @Column({ type: 'boolean', default: false })
    responseReceived: boolean;

    @Column({ name: 'response_date', type: 'timestamp', nullable: true })
    responseDate: Date;

    @Column({ type: 'boolean', default: false })
    followupDone: boolean;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    createdBy: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'updated_by' })
    updatedBy: User;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: true })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
    deletedAt: Date;
}
