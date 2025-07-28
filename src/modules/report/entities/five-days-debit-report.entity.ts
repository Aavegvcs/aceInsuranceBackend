import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

@Entity('five_days_debit_report')
export class FiveDaysDebitReport {

    @PrimaryColumn({ nullable: false })
    clientId: string;

    @Column({ type: 'varchar', length: 100 })
    clientName: string;

    @Column({ type: 'varchar', length: 50 })
    branchId: string;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    closingBalance: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    threeDays: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    fourDays: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    fiveDays: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    sixDays: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    sevenDays: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    moreThanSevenDays: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    closingStock: number; 

}