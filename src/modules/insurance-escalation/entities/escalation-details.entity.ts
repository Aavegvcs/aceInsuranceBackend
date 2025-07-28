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
    OneToMany
} from 'typeorm';
import { EscalationCase } from './escalation-case.entity';
import { User } from '@modules/user/user.entity';
@Entity('escalation_details')
export class EscalationDetails extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'is_product_suggested', type: 'boolean', default:true })
    isProductSuggested: boolean;

    @Column({ name: 'suggested_product', type: 'json', nullable: true })
    suggestedProduct: string[]; // e.g., ["life", "moto"]

    @Column({ name: 'why_not_suggested_reason', type: 'text', nullable: true })
    whyNotSuggestedReason: string;

    @Column({ name: 'got_response_from_customer', type: 'boolean', default:false, nullable: true  })
    gotResponseFromCustomer: boolean;

    @Column({ name: 'response_from_customer', type: 'text', nullable: true })
    responseFromCustomer: string;


    @Column({ name: 'response_received_on', type: 'timestamp', nullable: true })
    responseReceivedOn: Date;

    @Column({ name: 'need_tele_call', type: 'boolean', nullable: true, default: false })
    needTeleCall: boolean;

    @Column({ name: 'told_other_products', type: 'boolean', nullable: true })
    toldOtherProducts: boolean;

    @Column({ name: 'notified_to_higher_staff', type: 'boolean', nullable: true })
    notifiedToHigherStaff: boolean;

    @Column({ name: 'reason_notified', type: 'text', nullable: true })
    reasonNotified: string;

    @OneToOne(() => EscalationCase, (caseEntity) => caseEntity.escalationDetails)
    @JoinColumn({ name: 'case_id' })
    case: EscalationCase;

    @Column({ name: 'escalated_on', type: 'timestamp', nullable: true })
    escalatedOn: Date;

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
