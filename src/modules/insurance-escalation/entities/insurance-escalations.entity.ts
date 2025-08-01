import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany
} from 'typeorm';
import { InsuranceTicket } from '../../insurance-ticket/entities/insurance-ticket.entity';
import { InsuranceAgent } from '../../insurance-ticket/entities/insurance-agent.entity';
import { InsuranceProductSuggestions } from './insurance-product-suggestions.entity';
import { User } from '@modules/user/user.entity';
import { InsuranceClientResponses } from './insurance-client-response.entity';

@Entity({ name: 'insurance_escalations' })
export class InsuranceEscalations {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => InsuranceTicket, (ticket) => ticket.escalations, {
        nullable: true
    })
    @JoinColumn({ name: 'ticket_id' })
    ticketId: InsuranceTicket;

    @ManyToOne(() => InsuranceAgent, (agent) => agent.escalations, {
        nullable: false
    })
    @JoinColumn({ name: 'esclated_to' })
    esclated_to: InsuranceAgent;

    @Column({
        type: 'enum',
        enum: ['Open', 'Closed', 'Pending Follow-up'],
        default: 'Open'
    })
    caseStatus: string;

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

    @OneToMany(() => InsuranceProductSuggestions, (suggestion) => suggestion.escalation)
    suggestedProduct: InsuranceProductSuggestions[];

    @OneToMany(() => InsuranceClientResponses, (response) => response.escalation)
    responses: InsuranceClientResponses[];

    // @OneToMany(
    //   () => InsuranceAgentEscalations,
    //   (agentEscalation) => agentEscalation.escalation,
    // )
    // agentEscalations: InsuranceAgentEscalations[];
}
