import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    OneToOne,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    OneToMany
} from 'typeorm';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { User } from '@modules/user/user.entity';
import { QuoteEntity } from './quote.entity';
import { Quotation_Status } from 'src/utils/app.utils';

@Entity({ name: 'insurance_quotation' })
export class InsuranceQuotation {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'qutation_no', nullable: true })
    quotationNo: string;

    @Column({ name: 'ticket_number' })
    ticketnumber: string;

    @ManyToOne(() => InsuranceTicket, (ticket) => ticket.quotations)
    @JoinColumn({ name: 'ticket_id' })
    ticketId: InsuranceTicket;


 
    @Column({ name: 'validity_date', type: 'timestamp' })
    validityDate: Date;

    @Column({
        type: 'enum',
        enum: Quotation_Status,
        default: 'QUOTATION_GENERATED'
    })
    status: Quotation_Status;

    @Column({ name: 'is_mail_send', type: 'boolean', default: false })
    isMailSend: boolean;

    @Column({ name: 'status_changed_remarks', nullable: true })
    statusChangedRemarks: string;

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

    @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
    sentAt: Date;

    @OneToMany(() => QuoteEntity, (data) => data.quotationId, { nullable: true })
    quotes: QuoteEntity[];
}
