import { BaseEntity, Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity('client_summary')
@Index(['clientId', 'branchId', 'month'], { unique: true })
export class ClientSummary extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 50 })
    clientId: string;

    @PrimaryColumn({ type: 'varchar', length: 50 })
    branchId: string;

    @PrimaryColumn({ type: 'varchar', length: 7 }) // Format: YYYY-MM
    month: string;

    @Column({ type: 'varchar', length: 255 })
    clientName: string;

    @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
    totalGross: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
    totalNet: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
    eqGross: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
    eqNet: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
    comGross: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
    comNet: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
    currGross: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
    currNet: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
    slbmGross: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
    slbmNet: number;

    // Helper method to generate month key
    static generateMonthKey(date: Date): string {
        return `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}`;
    }
}