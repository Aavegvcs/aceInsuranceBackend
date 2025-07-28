import { BaseEntity, Column, Entity, PrimaryColumn, Index } from 'typeorm';

@Entity()
@Index(['branchId', 'financialYear'], { unique: true })
export class AnnualBranchStats extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 50 })
    branchId: string;

    @Column()
    financialYear: string;

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

    @Column({ type: 'decimal', precision: 20, scale: 2, name: 'total_brokerage', nullable: true })
    totalBrokerage: number;

    @Column({ type: 'int', default: 0, name: 'average', nullable: true })
    average: number; // Average of all the months

    @Column({ type: 'int', default: 0, name: 'traded_clients', nullable: true })
    tradedClients: number; // Total number of traded clients 

}
