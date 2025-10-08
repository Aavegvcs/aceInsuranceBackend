import { InsuranceProduct } from '@modules/insurance-product/entities/insurance-product.entity';
import { QuoteEntity } from '@modules/insurance-quotations/entities/quote.entity';
import { User } from '@modules/user/user.entity';
import { Insurance_Type } from 'src/utils/app.utils';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique
} from 'typeorm';
import { InsuranceFeatures } from './insurance-features.entity';

// throug this table features will show on quotations
@Entity({ name: 'quote_features' })
@Unique(['quote', 'insuranceFeatures'])
export class QuoteFeatures {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => QuoteEntity)
    @JoinColumn({ name: 'quote_id' })
    quote: QuoteEntity;

    @ManyToOne(() => InsuranceFeatures)
    @JoinColumn({ name: 'insurance_features_id' })
    insuranceFeatures: InsuranceFeatures;

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

    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
    deletedAt: Date;
}
