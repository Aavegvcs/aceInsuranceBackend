import { QuoteEntity } from '@modules/insurance-quotations/entities/quote.entity';
import { User } from '@modules/user/user.entity';
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
import { InsuranceWaitingPeriod } from './insurance-waiting-period.entity';

// throug this table features will show on quotations
@Entity({ name: 'quote_waiting_period' })
@Unique(['quote', 'insuranceWaitingPeriod'])
export class QuoteWaitingPeriod {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => QuoteEntity)
    @JoinColumn({ name: 'quote_id' })
    quote: QuoteEntity;

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
