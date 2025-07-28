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
import { Client } from '@modules/client/entities/client.entity';
import { Insurance_Product_Status } from 'src/utils/app.utils';
import { InsuranceProduct } from '@modules/insurance-product/entities/insurance-product.entity';
import { InsuranceIncentives } from '@modules/insurance-product/entities/insurance-incentives.entity';
import { InsuranceAgent } from '@modules/insurance-ticket/entities/insurance-agent.entity';
import { User } from '@modules/user/user.entity';
import { InsuranceUser } from '@modules/insurance-ticket/entities/insurance-user.entity';

@Entity({ name: 'insurance_purchased_product' })
export class InsurancePurchasedProduct {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'policy_number', nullable: true })
    policyNumber: string;

    @ManyToOne(() => InsuranceUser, (data) => data.purchasedProduct, {
        nullable: false
    })
    @JoinColumn({ name: 'insurance_user_id' })
    insuranceUserId: InsuranceUser;

    @ManyToOne(() => InsuranceAgent, (agent) => agent.purchasedProduct, {
        nullable: false
    })
    @JoinColumn({ name: 'agent_id' })
    agentId: InsuranceAgent;

    @ManyToOne(() => InsuranceProduct, (product) => product.purchasedProduct, {
        nullable: false
    })
    @JoinColumn({ name: 'product_id' })
    productId: InsuranceProduct;

    // @ManyToOne(() => InsuranceTicket, (ticket) => ticket.purchasedProduct, {
    //   nullable: false,
    // })
    // @JoinColumn({ name: 'ticket_id' })
    // ticketId: InsuranceTicket;
    @ManyToOne(() => InsuranceTicket, (ticket) => ticket.purchasedProduct, {
        nullable: true
    })
    @JoinColumn({ name: 'ticket_id' })
    ticketId: InsuranceTicket | null;

    @Column({
        name: 'insurance_amount',
        type: 'decimal',
        precision: 10,
        scale: 2,
        nullable: true
    })
    insuranceAmount: number;

    @Column({ name: 'purchased_date', nullable: false })
    purchasedDate: Date;

    @Column({ name: 'renewal_date', nullable: false })
    renewalDate: Date;

    @Column({
        type: 'enum',
        enum: Insurance_Product_Status,
        name: 'product_status',
        default: Insurance_Product_Status.ACTIVE,
        nullable: false
    })
    insuranceType: Insurance_Product_Status;

    @Column({ name: 'any_remarks', nullable: true })
    anyRemarks: string;

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

    @OneToOne(() => InsuranceIncentives, (data) => data.purchasedProductId, {
        nullable: true
    })
    insuranceIncentives: InsuranceIncentives;
}
