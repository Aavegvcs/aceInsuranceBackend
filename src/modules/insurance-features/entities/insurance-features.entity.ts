import { InsuranceTypeMaster } from '@modules/insurance-ticket/entities/insurance-type-master.entity';
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

@Entity({ name: 'insurance_features' })
@Unique(['featuresName', 'insuranceType', 'isStandard'])
export class InsuranceFeatures {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'features_name', nullable: false })
    featuresName: string;

    @Column({ name: 'description', type: 'text', nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: Insurance_Type,
        name: 'insurance_type',
        nullable: false
    })
    insuranceType: Insurance_Type;
    
    @ManyToOne(() => InsuranceTypeMaster, { nullable: true })
    @JoinColumn({ name: 'insurance_types' })
    insuranceTypes: InsuranceTypeMaster;

    @Column({ name: 'is_standard', type: 'boolean', default: true })
    isStandard: boolean; // isStandard is true means it is basic features

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
