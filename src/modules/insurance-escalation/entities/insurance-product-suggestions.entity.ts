import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    ManyToOne,
    JoinColumn,
    UpdateDateColumn,
    DeleteDateColumn
} from 'typeorm';
import { InsuranceEscalations } from './insurance-escalations.entity';
import { InsuranceProduct } from '@modules/insurance-product/entities/insurance-product.entity';
import { User } from '@modules/user/user.entity';

@Entity({ name: 'insurance_product_suggestions' })
export class InsuranceProductSuggestions {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => InsuranceEscalations, (data) => data.suggestedProduct, { nullable: true })
    @JoinColumn({ name: 'escalation_id' })
    escalation: InsuranceEscalations;

    @Column({ type: 'boolean', nullable: false, default: false })
    suggested: boolean;

    @ManyToOne(() => InsuranceProduct, (data) => data.suggestedProducts, { nullable: true })
    @JoinColumn({ name: 'suggested_products' })
    suggestedProducts: InsuranceProduct;

    @Column({ name: 'reason_not_suggested', type: 'text', nullable: true })
    reasonNotSuggested: string;

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
}
