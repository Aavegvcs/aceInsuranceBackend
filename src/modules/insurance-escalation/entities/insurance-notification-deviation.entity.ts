import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { User } from '@modules/user/user.entity';
import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';


@Entity({ name: 'insurance_ticket_deviation' })
export class InsuranceTicketDeviation {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => InsuranceTicket, (ticket) => ticket.deviations)
    @JoinColumn({ name: 'ticket_id' })
    ticket: InsuranceTicket;

    @Column({ type: 'enum', enum: ['none', 'first', 'second'], nullable: true })
    deviationLevel: string; // e.g., 'first' (insurance manager), 'second' (product head)

    @Column({ type: 'boolean', default: false })
    isResolved: boolean; // Tracks if the deviation was resolved

    @Column({ type: 'timestamp' })
    deviationDeadline: Date; // The deadline that was missed (or escalation deadline)

    @Column()
    step: string; // The step where deviation occurred (e.g., 'PAYMENT_LINK_GENERATED')

    // @ManyToOne(() => User, { nullable: true })
    // assignedTo: User; // User responsible for resolving (e.g., insurance manager or product head)

    @ManyToOne(() => User)
    createdBy: User; // System user creating the deviation record

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;
}