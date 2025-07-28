import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('client_dashboard_stats')
export class ClientDashboardStats {
    @PrimaryColumn()
    clientId: string;

    @PrimaryColumn({ type: 'date' })
    date: Date; // Date-only field to store daily stats

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    portfolioValue: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    totalHolding: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    equities: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    mutualFunds: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    totalBalance: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    spanMargin: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    ledgerBalance: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    portfolioValueChange: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    totalHoldingChange: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    equitiesChange: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    mutualFundsChange: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    totalBalanceChange: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    spanMarginChange: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    ledgerBalanceChange: number;

    @UpdateDateColumn()
    updatedAt: Date;
}
