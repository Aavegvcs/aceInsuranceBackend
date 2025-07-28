import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    BeforeInsert,
} from 'typeorm';

@Entity('queue_log', { schema: 'public' })
export class QueueLog {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'jobId' })
    jobId: string; // Bull job ID (string in Bull)

    @Column({ name: 'queueName' })
    queueName: string; // e.g., 'report-processing'

    @Column({ name: 'jobName' })
    jobName: string; // e.g., 'update-client-summary'

    @Column({ name: 'logEvent' })
    logEvent: string; // e.g., 'QUEUE_UPDATE_CLIENT_SUMMARY_SUCCESS'

    @Column({ name: 'logDetails', nullable: true })
    logDetails: string | null; // Error message or job-specific details (e.g., tradeDate)

    @CreateDateColumn({ type: 'timestamp', default: null, nullable: true })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updatedAt', default: () => 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deletedAt', nullable: true })
    deletedAt: Date | null;

    @BeforeInsert()
    updateTimestamps() {
        this.createdAt = new Date();
    }
}