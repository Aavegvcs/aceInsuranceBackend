import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

@Entity('touch_turnover')
export class TouchTurnover {
    @Column()
    branchId: string;

    @Column()
    clientName: string;

    @PrimaryColumn({ nullable: false }) // Changed to PrimaryColumn, not nullable
    rowKey: string;

    @Column({ nullable: true })
    clientId: string;

    @Column({ nullable: true, type: 'date' })
    tradeDate: Date;

    @Column({ nullable: true })
    cocd: string;

    @Column({ nullable: true, type: 'decimal', precision: 15, scale: 2 })
    netBrokerage: number;

    @Column({ nullable: true }) // Add region_branch_id column
    regionBranchId: string;
}
