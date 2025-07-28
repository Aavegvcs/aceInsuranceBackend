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

@Entity({ name: 'insurance_agent_escalations' })
export class InsuranceAgentEscalations {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => InsuranceEscalations)
    @JoinColumn({ name: 'escalation_id' })
    escalation: InsuranceEscalations;

    @Column({ type: 'boolean', default: false })
    agentInformed: boolean;

    @Column({ name: 'action_taken', type: 'text', nullable: true })
    actionTaken: string;

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
