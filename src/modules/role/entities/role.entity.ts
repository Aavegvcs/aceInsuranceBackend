import { RoleFeatureAction } from 'src/modules/role-feature-action/entities/role-feature-action.entity';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';
@Entity({ name: 'role' })
export class Role {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    roleName: string;


    /*---------------------------------------RoleFeatureAction-Relation-------------------------------------------------*/

    @OneToMany(() => RoleFeatureAction, (roleFeatureAction) => roleFeatureAction.roleId)
    roleFeatureAction: RoleFeatureAction[];

    @Column()
    description: string;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;
}
