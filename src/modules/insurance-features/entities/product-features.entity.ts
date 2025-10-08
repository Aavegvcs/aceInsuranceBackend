import { InsuranceProduct } from '@modules/insurance-product/entities/insurance-product.entity';
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
    JoinColumn
} from 'typeorm';
import { InsuranceFeatures } from './insurance-features.entity';

@Entity({ name: 'product_features' })
export class ProductFeatures {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => InsuranceProduct)
    @JoinColumn({ name: 'product_id' })
    product: InsuranceProduct;

    @ManyToOne(() => InsuranceFeatures)
    @JoinColumn({ name: 'insurance_features_id' })
    insuranceFeatures: InsuranceFeatures;

    @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2, nullable: true })
    price: number;

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
