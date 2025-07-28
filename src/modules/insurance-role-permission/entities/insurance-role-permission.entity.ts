import {
    Entity,
    PrimaryGeneratedColumn,
    ManyToOne,
    JoinColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    Unique
} from 'typeorm';
import { InsurancePermission } from './insurance-permission.entity';
import { Role } from '@modules/role/entities/role.entity';
import { User } from '@modules/user/user.entity';

@Entity({ name: 'insurance_role_permission' })
@Unique(['role', 'permission'])
export class InsuranceRolePermission {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Role)
    @JoinColumn({ name: 'role_id' })
    role: Role;

    @ManyToOne(() => InsurancePermission)
    @JoinColumn({ name: 'permission_id' })
    permission: InsurancePermission;

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
