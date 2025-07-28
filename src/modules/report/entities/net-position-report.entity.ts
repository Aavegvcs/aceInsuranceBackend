// src/modules/report/entities/net-position.entity.ts
import { BaseEntity, Column, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('net_positions_report')
export class NetPositionReport extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    clientId: string; // Client Code

    @Column({ nullable: true })
    exchange: string; // Exchange (e.g., NSE, MCX)

    @Column()
    scripName: string; // Scrip symbol (e.g., HEROMOTOCO 27Mar2025 3700 CE)

    @Column()
    instrumentType: string; // Instrument Type (e.g., FUT, OPT)

    @Column('int', { nullable: true, default: 0 })
    netQuantity: number; // Quantity (net position)

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    netRate: number; // Avg. Rate (average price of the position)

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    strikePrice: number; // strike price (amount at which the option can be exercised)

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    closingPrice: number; // Closing Price

    @Column('decimal', { precision: 15, scale: 2, nullable: true })
    notional: number; // Unrealized P&L (profit and loss)

    @Column('decimal', { precision: 15, scale: 2, nullable: true })
    outstandingAmount: number; // Outstanding Amount

    @Column()
    branchId: string; // Branch ID

    @Column({ nullable: true, type: 'date', default: null })
    expiryDate: Date; // Expiry date of the scrip
}
