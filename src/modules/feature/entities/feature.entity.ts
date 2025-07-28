import { ApiProperty } from '@nestjs/swagger';
import { FeatureAction } from 'src/modules/feature-action/entities/feature-action.entity';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';

@Entity({ name: 'feature' })
export class Feature {
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({
        description: 'Name of Feature',
        example: 'User | Organization | Media | Billing | VideoCall'
    })
    @Column({ nullable: true })
    featureName: string;

    @Column({ nullable: true })
    description: string;

    /*---------------------------------------FeatureAction-Relation-------------------------------------------------*/

    @OneToMany(() => FeatureAction, (featureAction) => featureAction.featureId)
    featureAction: FeatureAction[];

    @Column({ nullable: true })
    createdBy: string;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;
}
