import { ApiProperty } from '@nestjs/swagger';
import { Action } from 'src/modules/action/entities/action.entity';
import { Feature } from 'src/modules/feature/entities/feature.entity';
import { RoleFeatureAction } from 'src/modules/role-feature-action/entities/role-feature-action.entity';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';

@Entity({ name: 'feature_action' })
export class FeatureAction {
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({
        description: 'Id of Feature',
        example: 1
    })
    @ManyToOne(() => Feature, (feature) => feature.featureAction)
    @JoinColumn({ name: 'featureId' })
    featureId: Feature;

    @ApiProperty({
        description: 'Id of Permission',
        example: 1
    })
    @ManyToOne(() => Action, (action) => action.featureAction)
    @JoinColumn({ name: 'permissionId' })
    permissionId: Action;

    /*---------------------------------------RoleFeatureAction-Relation-------------------------------------------------*/

    @OneToMany(() => RoleFeatureAction, (roleFeatureAction) => roleFeatureAction.featureActionId)
    roleFeatureAction: RoleFeatureAction[];

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp', onUpdate: 'CURRENT_TIMESTAMP(6)' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;
}
