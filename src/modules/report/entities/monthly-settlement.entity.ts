import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('monthly_settlement')
export class MonthlySettlement extends BaseEntity {
    @PrimaryColumn({ nullable: false })
    clientId: string;

    @Column({ nullable: false })
    clientName: string;

    @Column({ nullable: false })
    branchId: string;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    netPaymentRelease: number;

    @Column({ type: 'date', nullable: true })
    lastTradedDate: Date | null;

    @Column({ nullable: false })
    daysLastTraded: number;
}