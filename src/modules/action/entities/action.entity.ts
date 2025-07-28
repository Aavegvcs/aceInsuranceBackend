import { ApiProperty } from '@nestjs/swagger';
import { FeatureAction } from 'src/modules/feature-action/entities/feature-action.entity';
import {
    BeforeInsert,
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';

@Entity({ name: 'action' })
export class Action {
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({
        description: 'Name of Action',
        example: 'CREATE | READ | UPDATE | DELETE | PRINT | START | STOP | PAUSE | RESUME'
    })
    @Column()
    actionName: string;

    @Column()
    description: string;

    /*---------------------------------------FeatureAction-Relation-------------------------------------------------*/

    @OneToMany(() => FeatureAction, (featureAction) => featureAction.permissionId)
    featureAction: FeatureAction[];

    @CreateDateColumn({ type: 'timestamp', default: null, nullable: true })
    createdAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)'
    })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;

    @BeforeInsert()
    updateTimestamps() {
        this.createdAt = new Date(Date.now());
    }
}
