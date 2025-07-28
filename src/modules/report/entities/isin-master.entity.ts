import {
    Entity,
    Column,
    BaseEntity,
    PrimaryColumn
} from 'typeorm';

@Entity('isin_master')
export class ISINMaster extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 12, unique: true })
    isinCode: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    scripName: string;
}
