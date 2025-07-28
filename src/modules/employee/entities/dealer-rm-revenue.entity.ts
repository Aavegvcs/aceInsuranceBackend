import {
    BaseEntity,
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    BeforeInsert,
    Index,
    ManyToMany,
    JoinTable,
} from 'typeorm';
import { Employee } from '@modules/employee/entities/employee.entity';
import { Client } from '@modules/client/entities/client.entity';

export enum RevenueRole {
    RM = 'RM',
    DEALER = 'DEALER'
}

@Entity('dealer_rm_revenue')
export class DealerRMRevenue extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 200 })
    id: string;

    @ManyToOne(() => Employee, (employee) => employee.revenues, { nullable: false })
    @JoinColumn({ name: 'employeeId' })
    employee: Employee;

    @Column({ type: 'enum', enum: RevenueRole, nullable: false })
    role: RevenueRole;

    @ManyToMany(() => Client, (client) => client.revenues)
    @JoinTable({
        name: 'client_dealer_rm_revenue',
        joinColumn: { name: 'revenueId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'clientId', referencedColumnName: 'id' }
    })
    clients: Client[];

    @Column({ type: 'varchar', length: 50, nullable: true })
    terminalId: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    cocd: string;

    @Column({ type: 'date', nullable: false })
    periodStart: Date;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    netBrokerage: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
    tradeAmount: number;

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

    @BeforeInsert()
    generateId() {
        const period = this.periodStart;
        const terminalPart = this.terminalId || 'no-terminal';
        const cocdPart = this.cocd || 'no-cocd';
        // Get employeeId from relation
        const employeeId = this.employee?.id || 'unknown';
        this.id = `${employeeId}_${this.role}_${terminalPart}_${period}_${cocdPart}`;
    }
}

