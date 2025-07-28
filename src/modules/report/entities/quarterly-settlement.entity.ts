import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('quarterly_settlement')
export class QuarterlySettlement extends BaseEntity {
    @PrimaryColumn({ nullable: false })
    clientId: string;

    @Column({ nullable: false })
    clientName: string;

    @Column({ nullable: false })
    branchId: string;

    @Column({ nullable: false })
    netPaymentRelease: number;

}
