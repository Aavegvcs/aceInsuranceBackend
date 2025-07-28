import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('report_logs')
export class ReportLogs {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    fileName: string;

    @CreateDateColumn()
    updatedAt: Date;

    @Column({ type: 'int', default: 0 })
    totalRows: number;

    @Column({ type: 'int', default: 0 })
    dbCount: number;

    @Column({ type: 'int', default: 0 })
    insertedCount: number;

    @Column({ type: 'int', default: 0 })
    updatedCount: number;

    @Column({ type: 'int', default: 0 })
    errorCount: number;
}