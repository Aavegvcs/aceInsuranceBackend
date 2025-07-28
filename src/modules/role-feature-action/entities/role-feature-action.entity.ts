import { ApiProperty } from '@nestjs/swagger';
import { FeatureAction } from 'src/modules/feature-action/entities/feature-action.entity';
import { Role } from 'src/modules/role/entities/role.entity';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';

@Entity({ name: 'role_feature_action' })
export class RoleFeatureAction {
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({
        description: 'Id of Role',
        example: 1
    })
    @ManyToOne(() => Role, (role) => role.roleFeatureAction)
    @JoinColumn({ name: 'roleId' })
    roleId: Role;

    @ApiProperty({
        description: 'Id of feature_action',
        example: 1
    })
    @ManyToOne(() => FeatureAction, (featureAction) => featureAction.roleFeatureAction)
    @JoinColumn({ name: 'featureActionId' })
    featureActionId: FeatureAction;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;
}
