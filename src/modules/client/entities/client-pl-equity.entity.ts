import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('profit_loss_equity')
@Unique(['clientId', 'scripName', 'buyTradeDate', 'saleTradeDate', 'buyRate', 'saleRate'])
export class ClientProfitLossEquity extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    clientId: string;

    @Column()
    scripName: string;

    @Column()
    financialYear: string;

    @Column()
    clientName: string;

    @Column('decimal', { precision: 12, scale: 2, nullable: true })
    buyRate: number;

    @Column('decimal', { precision: 15, scale: 2 })
    buyAmount: number;

    @Column('decimal', { precision: 12, scale: 2 })
    buyQuantity: number;

    @Column('date')
    buyTradeDate: Date;

    @Column('decimal', { precision: 12, scale: 2, nullable: true })
    saleRate: number;

    @Column('decimal', { precision: 15, scale: 2 })
    saleAmount: number;

    @Column('decimal', { precision: 12, scale: 2 })
    saleQuantity: number;

    @Column('date', { nullable: true })
    saleTradeDate: Date;

    @Column('decimal', { precision: 15, scale: 2 })
    plAmount: number;

    @Column('decimal', { precision: 15, scale: 2 })
    shortTerm: number;

    @Column('decimal', { precision: 15, scale: 2 })
    longTerm: number;

    @Column('decimal', { precision: 15, scale: 2 })
    trading: number;

    @Column()
    tradeType: string;

    @Column()
    region: string;

    @Column()
    branchId: string;

    @Column('decimal', { precision: 12, scale: 2, nullable: true })
    closingPrice: number;

    @Column()
    isin: string;
}