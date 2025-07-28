import { BankAccount } from '@modules/bank-accounts/entities/bank-account.entity';
import { Branch } from '@modules/branch/entities/branch.entity';
import { Dealer } from '@modules/employee/entities/dealer.entity';
import { User } from '@modules/user/user.entity';
import {
    BaseEntity,
    BeforeInsert,
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToMany,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryColumn,
    UpdateDateColumn
} from 'typeorm';
import { Employee } from '@modules/employee/entities/employee.entity';
import { DealerRMRevenue } from '@modules/employee/entities/dealer-rm-revenue.entity';

@Entity()
export class Client extends BaseEntity {
    @PrimaryColumn({ unique: true, type: 'varchar', length: 50 })
    id: string;

    @OneToOne(() => User, (user) => user.client, { nullable: false })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ nullable: true })
    panNumber: string;

    @Column({ nullable: true })
    dpId: string;

    @Column({ name: 'is_online_client', nullable: true })
    isOnlineClient: boolean;

    @Column({ nullable: true })
    mappingStatus: boolean;

    @Column({ nullable: true })
    clientActivationDate: Date;

    @Column({ nullable: true })
    clientReactivationDate: Date;

    @Column({ nullable: true })
    familyGroup: string;

    @Column({ nullable: true })
    notTradedDays: number;

    // many to one relationship with Employee
    @ManyToOne(() => Employee, (employee) => employee.rmClients, { nullable: true })
    @JoinColumn({ name: 'rm' })
    rm: Employee;

    @ManyToOne(() => Dealer, (dealer) => dealer.equityClients, {
        nullable: true
    })
    @JoinColumn({ name: 'equity_dealer' })
    equityDealer: Dealer;

    @ManyToOne(() => Dealer, (dealer) => dealer.commodity1Clients, {
        nullable: true
    })
    @JoinColumn({ name: 'commodity_dealer1' })
    commodityDealer1: Dealer;

    @ManyToOne(() => Dealer, (dealer) => dealer.commodity2Clients, {
        nullable: true
    })
    @JoinColumn({ name: 'commodity_dealer2' })
    commodityDealer2: Dealer;

    @ManyToOne(() => Branch, (branch) => branch.clients, { nullable: false })
    @JoinColumn({ name: 'branch_id' })
    branch: Branch;

    @ManyToOne(() => Branch, (branch) => branch.clients, { nullable: true })
    @JoinColumn({ name: 'region_branch_id' })
    regionBranch: Branch;

    @ManyToMany(() => DealerRMRevenue, (revenue) => revenue.clients)
    revenues: DealerRMRevenue[];

    @OneToMany(() => BankAccount, (bankAccount) => bankAccount.client)
    bankAccounts: BankAccount[];

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

}
