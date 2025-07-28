import { BaseEntity, Column, Entity, PrimaryColumn, Unique } from 'typeorm';

@Entity('profit_loss_commodity')
@Unique(['clientId', 'scripName', 'cocd', 'financialYear'])
export class ClientProfitLossCommodity extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 10 })
    clientId: string;

    @Column()
    clientName: string;

    @PrimaryColumn({ type: 'varchar', length: 20 })
    cocd: string;

    @Column('decimal', { precision: 15, scale: 2 })
    buyAmount: number;

    @Column('decimal', { precision: 15, scale: 2 })
    buyQuantity: number;

    @Column('decimal', { precision: 15, scale: 2 })
    saleAmount: number;

    @Column('decimal', { precision: 15, scale: 2 })
    saleQuantity: number;

    @Column('decimal', { precision: 15, scale: 2 })
    opAmount: number;

    @Column('decimal', { precision: 15, scale: 2 })
    opQuantity: number;

    @Column('decimal', { precision: 15, scale: 2 })
    plAmount: number;

    @Column('decimal', { precision: 15, scale: 2 })
    notional: number;

    @PrimaryColumn({ type: 'varchar', length: 100 })
    scripName: string;

    @Column()
    branchId: string;

    @PrimaryColumn({ type: 'varchar', length: 4 })
    financialYear: string;

    @Column('decimal', { precision: 10, scale: 2 })
    closingPrice: number;

    @Column({ nullable: true, type: 'date', default: null })
    expiryDate: Date;

    @Column()
    isin: string;
}