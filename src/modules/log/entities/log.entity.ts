import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    BeforeInsert
} from 'typeorm';
@Entity('log', { schema: 'public' })
export class Log {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    refId: number | null;

    @Column({ nullable: true })
    refTypeId: number;

    @Column({ name: 'logEvent' })
    logEvent: string;

    @Column({ name: 'logDetails', nullable: true })
    logDetails: string | null;

    @Column({ name: 'ipDetails', nullable: true })
    ipDetails: string | null;

    @Column({ name: 'createdBy', nullable: true })
    createdBy: number;

    @CreateDateColumn({ type: 'timestamp', default: null, nullable: true })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updatedAt', default: () => 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' }) // Set default to current timestamp with timezone
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deletedAt', nullable: true })
    deletedAt: Date | null;

    @BeforeInsert()
    updateTimestamps() {
        this.createdAt = new Date(Date.now());
    }
}
