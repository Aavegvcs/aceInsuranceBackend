import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import { InsuranceTicket } from './insurance-ticket.entity';
import { InsuranceAgent } from './insurance-agent.entity';
import { User } from '@modules/user/user.entity';

@Entity({ name: 'insurance_assigned_to' })
export class InsuranceAssignedTo {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => InsuranceTicket, (ticket) => ticket.ticketHistory, {
        nullable: false
    })
    @JoinColumn({ name: 'ticket_id' })
    ticketId: InsuranceTicket;

    @ManyToOne(() => User, (data) => data.ticketAssign, {
        nullable: false
    })
    @JoinColumn({ name: 'current_assign_to' })
    currentAssignedTo: User;

    @Column({ name: 'previous_assigned_to', type: 'json', nullable: true })
    previousAssignedTo: string; // { "userId": 101, "assignedAt": "2024-02-10T12:30:00Z" },

    @Column({ name: 'changed_by', nullable: true })
    changedBy: string;

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
