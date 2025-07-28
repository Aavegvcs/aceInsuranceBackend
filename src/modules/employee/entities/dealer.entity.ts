import {
    BaseEntity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    Entity,
    OneToOne,
    JoinColumn,
    PrimaryColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    BeforeInsert,
    ManyToMany,
    JoinTable
} from 'typeorm';
import { Client } from '@modules/client/entities/client.entity';
import { Employee } from '@modules/employee/entities/employee.entity';
import { Branch } from '@modules/branch/entities/branch.entity';

export enum DealerType {
    EQUITY = 'EQUITY',
    COMMODITY1 = 'COMMODITY1',
    COMMODITY2 = 'COMMODITY2'
}

export enum RmStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE'
}

@Entity()
export class Dealer extends BaseEntity {
    @PrimaryColumn({ nullable: false, unique: true })
    dealerId: string;

    @Column({ type: 'simple-array', nullable: true })
    terminals: string[] | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    target: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    targetCompleted: number;

    @Column({ type: 'enum', enum: DealerType, default: DealerType.EQUITY })
    dealerType: DealerType;

    @OneToOne(() => Employee, (employee) => employee.dealer, { nullable: false })
    @JoinColumn({ name: 'employeeId' })
    employee: Employee;

    @OneToMany(() => Client, (client) => client.equityDealer)
    equityClients: Client[];

    @OneToMany(() => Client, (client) => client.commodityDealer1)
    commodity1Clients: Client[];

    @OneToMany(() => Client, (client) => client.commodityDealer2)
    commodity2Clients: Client[];

    @ManyToMany(() => Branch, (branch) => branch.dealers)
    branches: Branch[];

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)'
    })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;
}
