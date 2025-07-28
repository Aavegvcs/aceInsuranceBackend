import { Entity, PrimaryColumn, Column, BaseEntity } from 'typeorm';

@Entity()
export class RiskReport extends BaseEntity {
    @PrimaryColumn({ nullable: false })
    clientId: string;

    @Column()
    branchId: string;

    @Column()
    clientName: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    financial: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    unrealized: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    stock: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    poaStock: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    collateralHaircut: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    cashMargin: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    margin: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    overall: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    fnoExposure: number;
}