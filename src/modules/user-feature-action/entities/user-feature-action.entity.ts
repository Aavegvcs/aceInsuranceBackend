import { FeatureAction } from 'src/modules/feature-action/entities/feature-action.entity';
import { User } from 'src/modules/user/user.entity';
import {
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    BeforeInsert,
    ManyToOne,
    JoinColumn,
    Column
} from 'typeorm';
@Entity({ name: 'user_feature_action' })
export class UserFeatureAction {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => FeatureAction)
    @JoinColumn({ name: 'featureAction' })
    featureAction: FeatureAction;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user' })
    user: User;

    @Column({ nullable: false })
    allowed: boolean;

    @CreateDateColumn({ type: 'timestamp', default: null, nullable: true })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;

    @BeforeInsert()
    updateTimestamps() {
        this.createdAt = new Date(Date.now());
    }
}
