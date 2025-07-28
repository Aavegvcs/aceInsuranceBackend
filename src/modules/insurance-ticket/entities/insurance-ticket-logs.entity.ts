import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '@modules/user/user.entity';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { TICKET_LOG_EVENTS, Ticket_Status } from 'src/utils/app.utils';

@Entity({ name: 'insurance_ticket_logs' })
export class InsuranceTicketLogs {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => InsuranceTicket, (ticket) => ticket.ticketLogs, { nullable: false })
    @JoinColumn({ name: 'ticket_id' })
    ticket: InsuranceTicket;

    @Column({
        type: 'enum',
        enum: Ticket_Status,
        name: 'ticket_status',
        nullable: false
    })
    ticketStatus: Ticket_Status;

    @Column({
        type: 'enum',
        enum: TICKET_LOG_EVENTS,
        name: 'event_type',
        nullable: false
    })
    eventType: TICKET_LOG_EVENTS;

    @Column({ name: 'log_details', type: 'json', nullable: false })
    logDetails: object;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'created_by' })
    createdBy: User;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'updated_by' })
    updatedBy: User;

    @Column({ name: 'remarks', nullable: true })
    remarks: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @CreateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;
}
