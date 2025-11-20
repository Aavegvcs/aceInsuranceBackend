import {
    BaseEntity,
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    OneToMany,
    OneToOne,
    JoinColumn,
    DeleteDateColumn,
    BeforeInsert,
    UpdateDateColumn
} from 'typeorm';
import { Branch } from '@modules/branch/entities/branch.entity';
import { Department } from '@modules/department/entities/department.entity';
import { InsuranceAgent } from '@modules/insurance-ticket/entities/insurance-agent.entity';
import { User } from '@modules/user/user.entity';
import { Dealer } from '@modules/employee/entities/dealer.entity';
// import { Client } from '@modules/client/entities/client.entity';
// import { DealerRMRevenue } from './dealer-rm-revenue.entity';

export enum EmployeeStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE'
}

@Entity()
export class Employee extends BaseEntity {
    @PrimaryColumn({ unique: true, type: 'varchar', length: 50 })
    id: string;

    @OneToOne(() => User, (user) => user.employee)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ nullable: false })
    designation: string;

    @Column({ nullable: true })
    panNumber: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
    salary: number;

    @ManyToOne(() => Branch, (branch) => branch.employees, { nullable: false })
    branch: Branch;

    @CreateDateColumn({ type: 'timestamp' })
    dateOfJoining: Date;

    @Column({ type: 'boolean', default: true })
    probation: boolean;

    @Column({
        type: 'enum',
        enum: EmployeeStatus,
        default: EmployeeStatus.ACTIVE
    })
    status: EmployeeStatus;

    @Column({ type: 'boolean', default: true, nullable: true })
    retain: boolean;

    @Column({ type: 'int', default: 0 })
    leaveDays: number;

    @ManyToOne(() => Department, (department) => department.employees)
    department: Department;

    @OneToOne(() => InsuranceAgent, (agent) => agent.employee, { nullable: true })
    agent: InsuranceAgent;

    @OneToOne(() => Dealer, (dealer) => dealer.employee, { nullable: true })
    dealer: Dealer;

    @OneToMany(() => Branch, (branch) => branch.regionalManager, { nullable: true })
    managedBranches: Branch[];

    // New one-to-many relationship for branches where the employee is an RM
    // @OneToMany(() => Branch, (branch) => branch.rm, { nullable: true })
    // rmBranches: Branch[];

    // @OneToMany(() => Client, (client) => client.rm)
    // rmClients: Client[];

    // @OneToMany(() => DealerRMRevenue, (revenue) => revenue.employee)
    // revenues: DealerRMRevenue[];

    @CreateDateColumn({ type: 'timestamp', default: null, nullable: true })
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
    updateTimestamps() {
        this.createdAt = new Date(Date.now());
    }
}