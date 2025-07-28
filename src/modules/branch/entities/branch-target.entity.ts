import { BaseEntity, Column, Entity, PrimaryColumn, Index } from 'typeorm';

@Entity('branch_target')
@Index(['branchId', 'month'], { unique: true })
export class BranchTarget extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 50 })
    branchId: string;

    @PrimaryColumn({ type: 'varchar', length: 7 })
    month: string; // Format: YYYY-MM

    @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
    equityTarget: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
    fnoTarget: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
    commodityTarget: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
    slbmTarget: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
    totalTarget: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
    mfTarget: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
    insuranceTarget: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
    bondsTarget: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
    othersTarget: number;

    @Column({ type: 'int', nullable: true })
    activeClientsGoal: number;

    @Column({ type: 'int', nullable: true })
    newClientsTarget: number;

    @Column({ type: 'int', nullable: true })
    reactivationClientsTarget: number;

    @Column({ type: 'int', nullable: true })
    noDays: number;

    // Helper method to generate month key
    static generateMonthKey(date: Date): string {
        return `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}`;
    }

    // Helper method to get first day of the month
    static getFirstDayOfMonth(date: Date): Date {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    }
}