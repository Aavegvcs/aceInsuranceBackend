import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToOne
} from 'typeorm';
import { InsuranceTicket } from '../../insurance-ticket/entities/insurance-ticket.entity';
import { InsuranceProduct } from './insurance-product.entity';
import { InsuranceAgent } from '../../insurance-ticket/entities/insurance-agent.entity';
import { InsurancePurchasedProduct } from '@modules/insurance-product/entities/insurance-puchased-product.entity';
import { User } from '@modules/user/user.entity';

@Entity({ name: 'insurance_incentives' })
export class InsuranceIncentives {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => InsuranceAgent, (agent) => agent.insuranceIncentives, {
        nullable: false
    })
    @JoinColumn({ name: 'agent_id' })
    agentId: InsuranceAgent;

    @ManyToOne(() => InsuranceTicket, (ticket) => ticket.insuranceIncentives, {
        nullable: false
    })
    @JoinColumn({ name: 'ticket_id' })
    ticketId: InsuranceTicket;

    @ManyToOne(() => InsuranceProduct, (product) => product.insuranceIncentives, {
        nullable: false
    })
    @JoinColumn({ name: 'product_id' })
    productId: InsuranceProduct;

    @OneToOne(() => InsurancePurchasedProduct, (data) => data.insuranceIncentives, {
        nullable: true
    })
    @JoinColumn({ name: 'purchased_id' })
    purchasedProductId: InsurancePurchasedProduct;

    @Column({
        name: 'insurance_amount',
        type: 'decimal',
        precision: 10,
        scale: 2,
        nullable: true
    })
    insuranceAmount: number;

    @Column({
        name: 'incentive_amount',
        type: 'decimal',
        precision: 10,
        scale: 2,
        nullable: true
    })
    incentiveAmount: number;

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
