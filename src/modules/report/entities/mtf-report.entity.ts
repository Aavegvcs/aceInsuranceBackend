import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

@Entity('mtf_report')
export class MtfReport {
    @PrimaryColumn({ nullable: false })
    clientId: string;

    @Column()
    branchId: string;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    ledgerBalance: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    mtfFunded: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    mtfTotalFundedAmount: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    mtfCashCollateral: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    mtfShareCollateral: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    mtfTotalCollateral: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    mtfRequiredMargin: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    mtfMtmLoss: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    mtfMarginShortAccess: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    mtfLimit: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    mtfMaxAmount: number;
}