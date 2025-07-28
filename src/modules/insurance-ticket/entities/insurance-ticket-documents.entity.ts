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
import { User } from '@modules/user/user.entity';

@Entity({ name: 'insurance_ticket_documents' })
export class InsuranceTicketDocuments {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => InsuranceTicket, (ticket) => ticket.ticketHistory, {
        nullable: false
    })
    @JoinColumn({ name: 'ticket_id' })
    ticketId: InsuranceTicket;

    @Column({ name: 'documents', type: 'json', nullable: true })
    documents: string;

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
