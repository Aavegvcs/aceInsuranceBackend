import { User } from '@modules/user/user.entity';
import { InsuranceModuleType, InsurancePermissionType } from 'src/utils/app.utils';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';

@Entity({ name: 'insurance_permission' })
@Unique(['name', 'type']) // Composite unique constraint
export class InsurancePermission {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    name: string; // e.g., 'quote.view', 'quote.edit'

    @Column('text')
    description: string;

    @Column({
        type: 'enum',
        enum: InsurancePermissionType
    })
    type: InsurancePermissionType;

   @Column({type:'enum', enum:InsuranceModuleType, nullable: true })
    module: InsuranceModuleType; // Optional module like 'quote', 'claim', etc.
    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    createdBy: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'updated_by' })
    updatedBy: User;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;
}
