import { Employee } from '@modules/employee/entities/employee.entity';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    OneToMany,
    ManyToMany,
    ManyToOne
} from 'typeorm';
import { InsuranceTicket } from './insurance-ticket.entity';
import { InsuranceEscalations } from '../../insurance-escalation/entities/insurance-escalations.entity';
import { InsuranceIncentives } from '../../insurance-product/entities/insurance-incentives.entity';
import { InsuranceAssignedTo } from '@modules/insurance-ticket/entities/insurance-ticket-assignedTo.entity';
import { InsurancePurchasedProduct } from '@modules/insurance-product/entities/insurance-puchased-product.entity';
import { User } from '@modules/user/user.entity';

@Entity('insurance_agent')
export class InsuranceAgent {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => Employee, (employee) => employee.agent, { cascade: true })
    @JoinColumn({ name: 'employee_id' })
    employee: Employee;

    @Column({ name: 'agent_code', type: 'varchar', length: 50, unique: true })
    agentCode: string;

    @Column({
        name: 'commission_rate',
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0
    })
    commissionRate: number;

    @Column({ type: 'varchar', length: 255 })
    region: string;

    @Column({
        type: 'enum',
        enum: ['Active', 'Inactive', 'Suspended'],
        default: 'Active'
    })
    status: string;

    @Column({ name: 'joining_date', type: 'date' })
    joiningDate: Date;

    @Column({ type: 'int', default: 0 })
    experience: number;

    @Column({
        name: 'contact_number',
        type: 'varchar',
        length: 15,
        nullable: true
    })
    contactNumber: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ type: 'text', nullable: true })
    remarks: string;

    @OneToOne(() => Employee, (employee) => employee.agent, { nullable: true })
    @JoinColumn({ name: 'supervisor_id' })
    supervisor: Employee;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'created_by' })
    createdBy: User;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'updated_by' })
    updatedBy: User;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: true })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
    deletedAt: Date;

    // @OneToMany(() => InsuranceTicket, (ticket) => ticket.assignTo, {
    //     nullable: false
    // })
    // ticket: InsuranceTicket[];

    @OneToMany(() => InsuranceEscalations, (escalations) => escalations.esclated_to, { nullable: false })
    escalations: InsuranceEscalations[];

    @OneToMany(() => InsuranceIncentives, (insuranceIncentives) => insuranceIncentives.agentId, { nullable: false })
    insuranceIncentives: InsuranceIncentives[];

    // @OneToMany(() => InsuranceAssignedTo, (ticketHistory) => ticketHistory.currentAssignedTo, { nullable: false })
    // ticketHistory: InsuranceAssignedTo[];

    @OneToMany(() => InsurancePurchasedProduct, (data) => data.agentId, {
        nullable: false
    })
    purchasedProduct: InsurancePurchasedProduct[];
}
