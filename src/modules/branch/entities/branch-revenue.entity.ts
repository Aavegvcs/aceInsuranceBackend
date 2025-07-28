import { BaseEntity, Column, Entity, PrimaryColumn, Index } from 'typeorm';

@Entity()
@Index(['branchId', 'month'], { unique: true })
export class BranchRevenue extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 50 })
    branchId: string;

    @PrimaryColumn({ type: 'varchar', length: 7 }) // Format: YYYY-MM
    month: string;

    @Column({ type: 'decimal', precision: 20, scale: 2, name: 'equity_brokerage', nullable: true })
    equityBrokerage: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, name: 'fno_brokerage', nullable: true })
    fnoBrokerage: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, name: 'commodity_brokerage', nullable: true })
    commodityBrokerage: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, name: 'slbm_brokerage', nullable: true })
    slbmBrokerage: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, name: 'mf_brokerage', nullable: true })
    mfBrokerage: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, name: 'insurance_brokerage', nullable: true })
    insuranceBrokerage: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, name: 'bonds_brokerage', nullable: true })
    bondsBrokerage: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, name: 'others_brokerage', nullable: true })
    othersBrokerage: number;

    @Column({ type: 'int', default: 0, name: 'equity_traded_clients', nullable: true })
    equityTradedClients: number; // Number of equity clients traded in the month

    @Column({ type: 'int', default: 0, name: 'fno_traded_clients', nullable: true })
    fnoTradedClients: number; // Number of FNO clients traded in the month

    @Column({ type: 'int', default: 0, name: 'commodity_traded_clients', nullable: true })
    commodityTradedClients: number; // Number of commodity clients traded in the month

    @Column({ type: 'int', default: 0, name: 'slbm_traded_clients', nullable: true })
    slbmTradedClients: number; // Number of SLBM clients traded in the month

    @Column({
        type: 'timestamp',
        //default: () => 'CURRENT_TIMESTAMP(6)',
        nullable: true
    })
    createdAt: Date; // First day of the month (e.g., 2025-05-01)

    // Helper method to generate month key
    static generateMonthKey(date: Date): string {
        return `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}`;
    }

    // Helper method to get first day of the month
    static getFirstDayOfMonth(date: Date): Date {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    }
}
