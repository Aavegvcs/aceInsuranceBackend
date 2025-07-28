import { BaseEntity, Column, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('holdings_statement')
export class HoldingsStatement extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: false })
    clientId: string;

    @Column({ nullable: false })
    clientName: string;

    @Column({ nullable: false })
    branchId: string;

    @Column({ nullable: false })
    isinCode: string;

    @Column({ nullable: false })
    scripName: string;

    @Column({ nullable: true })
    quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    buyAvg: number;

    @Column({ type: 'decimal', precision: 16, scale: 2, nullable: true })
    value: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    previousClosing: number;
}
