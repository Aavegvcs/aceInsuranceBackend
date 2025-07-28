import { BaseEntity, Column, Entity, PrimaryColumn, Index, CreateDateColumn } from 'typeorm';

@Entity('branch_client_stats', { schema: 'ace_stagedb' })
@Index(['branchId', 'month'], { unique: true })
export class BranchClientStats extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 50 })
    branchId: string;

    @PrimaryColumn({ type: 'varchar', length: 7 })
    month: string; // Format: YYYY-MM

    @Column({ type: 'int', nullable: true })
    newClientsTraded: number; // Clients trading for the first time in the month

    @Column({ type: 'int', nullable: true })
    reactivatedClientsTraded: number; // Clients who traded after 6+ months of inactivity

    @Column({ type: 'int', nullable: true })
    gainedClients: number; // New + Reactivated clients

    @Column({ type: 'int', nullable: true })
    expectedClientsWithoutChurn: number; // Previous month's traded clients + gained clients

    @Column({ type: 'int', nullable: true })
    totalTradedClients: number; // Total distinct clients traded in the month

    @Column({ type: 'int', nullable: true })
    lostClients: number; // Clients who traded last month but not this month

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    churnRate: number; // (lostClients / previousMonthTradedClients) * 100

    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)', nullable: false })
    createdAt: Date;

    static generateMonthKey(date: Date): string {
        return `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}`;
    }

    static getFirstDayOfMonth(date: Date): Date {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    }
}