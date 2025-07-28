import { BaseEntity, Entity, Column, PrimaryColumn, Index } from 'typeorm';

@Entity('segment_revenue')
export class SegmentRevenue extends BaseEntity {
    @PrimaryColumn({ nullable: false }) // Changed to PrimaryColumn, not nullable
    rowKey: string;

    @Column({ nullable: true })
    clientId: string;

    @Column({ nullable: true })
    clientName: string;

    @Column({ nullable: true })
    branchId: string;

    @Column({ nullable: true, type: 'date' })
    tradeDate: Date;

    @Column({ nullable: true, type: 'decimal', precision: 20, scale: 2 })
    tradeAmount: number;

    @Column({ nullable: true, type: 'decimal', precision: 15, scale: 2 })
    netBrokerage: number;

    @Column({ nullable: true, type: 'decimal', precision: 15, scale: 2 })
    grossBrokerage: number;

    @Column({ nullable: true })
    cocd: string;

    @Column({ nullable: true })
    exchange: string;

    @Column({ nullable: true })
    terminalId: string;

    @Column({ nullable: true, type: 'decimal', precision: 15, scale: 2 })
    rem1Brokerage: number;

    @Column({ nullable: true, type: 'decimal', precision: 15, scale: 2 })
    rem2Brokerage: number;
}