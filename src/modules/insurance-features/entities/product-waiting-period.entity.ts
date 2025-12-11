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
import { InsuranceWaitingPeriod } from './insurance-waiting-period.entity';
/*
** this table is maaped product and their waiting period
*/
@Entity({ name: 'product_waiting_period' })
export class ProductWaitingPeriod{
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => InsuranceProduct)
    @JoinColumn({ name: 'product_id' })
    product: InsuranceProduct;

    @ManyToOne(() => InsuranceWaitingPeriod)
    @JoinColumn({ name: 'insurance_waiting_period_id' })
    insuranceWaitingPeriod: InsuranceWaitingPeriod;

    @Column({type:'int', name: 'waiting_time', nullable: true })
    waitingTime: number;

    @Column({ name: 'time_type', nullable: true })
    timeType: string; // years, months, days

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
