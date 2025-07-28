import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { User } from '@modules/user/user.entity';
import { Current_Step } from 'src/utils/app.utils';
import { Entity, ManyToOne, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'insurance_ticket_notification' })
export class InsuranceTicketNotification {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => InsuranceTicket, (ticket) => ticket.notifications)
    ticket: InsuranceTicket;

    @Column()
    type: string; // e.g., 'deadline_exceeded', 'escalation'

    @ManyToOne(() => User)
    recipient: User;

    @Column()
    message: string;

    @Column({ type: 'timestamp' })
    sentAt: Date;

    @Column({ name: 'is_read', type: 'boolean', default: false })
    isRead: boolean;

    @Column({ type: 'timestamp', nullable: true })
    readAt: Date;

    @Column({ name: 'current_step_start', type: 'enum', enum: Current_Step, nullable: false })
    currentStep: Current_Step;

    @Column({ name: 'next_step_start', type: 'enum', enum: Current_Step, nullable: true })
    nextStep: Current_Step;

    @Column({ type: 'timestamp', nullable: true })
    exceededDeadline: Date;

    @ManyToOne(() => User)
    createdBy: User;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @CreateDateColumn({ type: 'timestamp' })
    updatedAt: Date;
}
