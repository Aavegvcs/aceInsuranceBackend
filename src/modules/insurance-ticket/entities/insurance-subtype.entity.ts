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
import { Insurance_Type } from 'src/utils/app.utils';
import { InsuranceProduct } from '../../insurance-product/entities/insurance-product.entity';
import { User } from '@modules/user/user.entity';
import { InsuranceTypeMaster } from '@modules/insurance-ticket/entities/insurance-type-master.entity';

@Entity({ name: 'insurance_sub_type' })
export class InsuranceSubType {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'name', nullable: true })
    name: string;

    @Column({ length: 50, unique: true })
    code: string;

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

    @Column({ name: 'description', nullable: true })
    description: string;

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

    @OneToMany(() => InsuranceProduct, (product) => product.insuranceSubType)
    product: InsuranceProduct[];
}
