import {
    BaseEntity,
    OneToMany,
    ManyToOne,
    JoinColumn,
    Column,
    Entity,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    PrimaryColumn,
    OneToOne,
    ManyToMany,
    JoinTable
} from 'typeorm';
import { Client } from '@modules/client/entities/client.entity';
import { Employee } from '@modules/employee/entities/employee.entity';
import { State } from '@modules/states/entities/state.entity';
import { branchModelsArr } from 'src/utils/app.utils';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { Dealer } from '@modules/employee/entities/dealer.entity';
import { Company } from '@modules/company/entities/company.entity';
import { User } from '@modules/user/user.entity';
import { Department } from '@modules/department/entities/department.entity';

@Entity()
export class Branch extends BaseEntity {
    @PrimaryColumn({ unique: true, type: 'varchar', length: 50, nullable: false })
    id: string;

    
    @Column({
        name: 'branch_code',
        unique: true,
        nullable:false
    })
    branchCode: string;

    @ManyToOne(() => Company, (company) => company.branch, { nullable: true })
    @JoinColumn({ name: 'company_id' })
    company: Company;

    @Column({ nullable: false })
    name: string;

    @Column({ type: 'enum', enum: branchModelsArr, nullable: false }) // Branch || AP || Introducer
    model: string;

    @ManyToOne(() => State, { nullable: true })
    @JoinColumn({ name: 'state_id' })
    state: State;

    @Column({ nullable: false })
    city: string;

    @Column({ nullable: false })
    pincode: number;

    @Column({name:'is_active', default: true })
    isActive: boolean;

    @Column()
    address: string;

    @Column({ type: 'simple-array', nullable: true })
    segments: string[];

    @Column({ nullable: true })
    email: string;

    @ManyToOne(() => Employee, (Employee) => Employee.managedBranches, { nullable: true })
    regionalManager: Employee;

    @ManyToOne(() => Employee, (employee) => employee.rmBranches, { nullable: true })
    @JoinColumn({ name: 'rmId' })
    rm: Employee;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    panNumber: string;

    @Column({ type: 'date', nullable: true })
    activationDate: Date;

    @Column({ default: false })
    mappingStatus: boolean;

    @Column({ type: 'float', nullable: true })
    sharing: number;

    @Column({ type: 'simple-array', nullable: true })
    terminals: string[];

    @Column({ name: 'contact_person', nullable: true })
    contactPerson: string;

    @CreateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    createdAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)'
    })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;

    // One-to-Many with Clients
    @OneToMany(() => Client, (client) => client.branch)
    clients: Client[];

    // One-to-Many with Clients
    @OneToMany(() => Client, (client) => client.regionBranch)
    onlineClients: Client[];

    // Self-referencing Many-to-One (Each branch can have one control branch)
    @ManyToOne(() => Branch, (branch) => branch.subBranches, { nullable: true })
    @JoinColumn({ name: 'control_branch_id' })
    controlBranch: Branch;

    // Self-referencing One-to-Many (Each branch can be a control branch for many)
    @OneToMany(() => Branch, (branch) => branch.controlBranch)
    subBranches: Branch[];

    @OneToMany(() => Employee, (employee) => employee.branch)
    employees: Employee[];

    @OneToMany(() => InsuranceTicket, (data) => data.barnchId)
    tickets: InsuranceTicket[];

    @OneToMany(() => User, (user) => user.branch)
    user: User[];

    
    @OneToMany(() => Department, (data) => data.branch)
    department: Department[];

    @ManyToMany(() => Dealer, (dealer) => dealer.branches)
    @JoinTable({
        name: 'branch_dealer',
        joinColumn: { name: 'branchId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'dealerId', referencedColumnName: 'dealerId' },
    })
    dealers: Dealer[];
}
