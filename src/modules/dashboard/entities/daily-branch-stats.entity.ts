import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('daily_branch_stats')
export class DailyBranchStats extends BaseEntity {
    @PrimaryColumn()
    branchId: string;

    @PrimaryColumn({ type: 'date' }) // Changed to 'date' to store only YYYY-MM-DD
    date: Date;

    // Brokerage Panel
    @Column({ type: 'decimal', precision: 20, scale: 2 })
    totalBrokerage: number;

    //Online Brokerage Panel
    @Column({ type: 'decimal', precision: 20, scale: 2 })
    onlineBrokerage: number;

    @Column({ type: 'decimal', precision: 20, scale: 2 })
    projectedBrokerage: number;

    @Column({ type: 'decimal', precision: 20, scale: 2 })
    monthlyBrokerage: number;

    @Column({ type: 'decimal', precision: 20, scale: 2 })
    monthlyAvgBrokerage: number;

    // Clients Panel
    @Column()
    totalClients: number;

    @Column()
    monthlyTradedClients: number;

    @Column()
    tradedClients: number;

    @Column()
    addedClients: number;

    // Franchisees Panel
    @Column()
    totalFranchisees: number;

    @Column()
    tradedFranchisees: number;

    @Column()
    addedFranchisees: number;

    // Days Panel
    @Column()
    totalTradingDays: number;

    @Column()
    remainingDays: number;

    @Column({ type: 'decimal', precision: 20, scale: 2 })
    avgRevenue: number;

    // Revenue Section
    @Column({ type: 'json' })
    segmentRevenue: { segment: string; value: number }[];

    @Column({ type: 'json' })
    modelRevenue: { model: string; value: number }[];

    // Top 10 Section
    @Column({ type: 'json' })
    top10Clients: { clientId: string; value: number }[];

    @Column({ type: 'json' })
    top10Franchisees: { branchId: string; value: number }[];

    // Target Field
    @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
    totalTarget: number;
}
