import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '@modules/user/user.entity';
import { EscalationDetails } from './escalation-details.entity';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';

@Entity('escalation_case')
export class EscalationCase extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

@Column({
  type: 'enum',
  enum: ['pending', 'inprogress', 'closed'],
  default: 'pending',
  name: 'case_status',
  nullable: false,
})
caseStatus: 'closed' | 'pending' | 'inprogress';
// e.g., case closed, pending, etc.

  @OneToOne(() => EscalationDetails, (details) => details.case, { cascade: true })
  escalationDetails: EscalationDetails;

    @ManyToOne(() => InsuranceTicket, (ticket) => ticket.escalationCases)
    @JoinColumn({ name: 'ticket_id' })
    ticket: InsuranceTicket;

    @Column({ name: 'ticket_number', nullable: true })
    ticketNumber: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date;
}