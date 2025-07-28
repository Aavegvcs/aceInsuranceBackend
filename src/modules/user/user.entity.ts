import { ApiProperty } from '@nestjs/swagger';
import {
    BaseEntity,
    BeforeInsert,
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';
import { Company } from '../company/entities/company.entity';
import { Country } from '../countries/entities/country.entity';
import { State } from '../states/entities/state.entity';
import { City } from '../cities/entities/city.entity';
import { Exclude } from 'class-transformer';
import { Client } from '@modules/client/entities/client.entity';
import { Employee } from '@modules/employee/entities/employee.entity';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { InsuranceAssignedTo } from '@modules/insurance-ticket/entities/insurance-ticket-assignedTo.entity';
import { USER_STATUS } from 'src/utils/app.utils';

@Entity({ name: 'user' })
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({
        description: 'firstName of user',
        example: 'kinze jay '
    })
    @Column({ nullable: true })
    firstName: string;

    @Column({ nullable: true, type: 'date' })
    dateOfBirth: Date;

    @Column({ nullable: true })
    gender: string;

    @Column({ nullable: true })
    middleName: string;

    @ApiProperty({
        description: 'lastName of user',
        example: 'kinzejay234'
    })
    @Column({ nullable: true })
    lastName: string;

    @ApiProperty({
        description: 'phoneNumber of user',
        example: '+1209785353'
    })
    @Column({ nullable: true })
    phoneNumber: string;

    @ApiProperty({
        description: 'unique email can be only alphabets or alphanumeric',
        example: 'kinzejay234@kinze.com'
    })
    @Column({ nullable: true })
    email: string;

    @ApiProperty({
        description: 'alphanumeric password',
        example: 'learning123'
    })
    @Exclude()
    @Column({ nullable: true })
    password: string;

    @Exclude()
    @Column({ nullable: true })
    newPassword: string;

    @Column({ nullable: true })
    userType: string;

    // Standalone clientId column for lookup during upserts
    @Column({ nullable: true, unique: true })
    clientId: string;

    // Standalone employeeId column for lookup during upserts
    @Column({ nullable: true, unique: true })
    employeeId: string;

    // One-to-One relationship with Client
    @OneToOne(() => Client, (client) => client.user)
    client: Client;

    @OneToOne(() => Employee, (data) => data.user)
    employee: Employee;

    @ApiProperty({
        description: 'OTP os user',
        example: '334455'
    })
    @Exclude()
    @Column({ nullable: true })
    otp: string;

    @ApiProperty({
        description: 'status of user',
        example: 'active'
    })
    @Column({ default: USER_STATUS.PENDING })
    status: string;

    @ManyToOne(() => Company)
    @JoinColumn({ name: 'company' })
    company: Company;

    @Exclude()
    @Column({ nullable: true })
    accessToken: string;

    @Exclude()
    @Column({ nullable: true })
    refreshToken: string;

    @Column({ nullable: true })
    logo: string;

    @CreateDateColumn({ type: 'timestamp' })
    lastLogin: Date;

    @Column({ type: 'simple-array', nullable: true })
    addresses: string[];

    @ManyToOne(() => Country)
    @JoinColumn({ name: 'country' })
    country: Country;

    @Column({ nullable: true })
    city: string;

    @ManyToOne(() => State, { nullable: true })
    @JoinColumn({ name: 'state' })
    state: State;

    @Column({ nullable: true })
    zip: string;

    @CreateDateColumn({ type: 'timestamp', default: null, nullable: true })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;

    @BeforeInsert()
    updateTimestamps() {
        this.createdAt = new Date(Date.now());
    }

    @Column({ nullable: true })
    prefix: string;

    @Column({ nullable: true })
    suffix: string;

    @Column({ nullable: true })
    street: string;
    @Column({ name: 'incentive_percentage', type: 'decimal', precision: 10, scale: 2, nullable: false })
    incentivePercentage: number;

    @OneToMany(() => InsuranceTicket, (data) => data.assignTo, { nullable: true })
    assignedTicket: InsuranceTicket[];

    @OneToMany(() => InsuranceAssignedTo, (ticketHistory) => ticketHistory.currentAssignedTo)
    ticketAssign: InsuranceAssignedTo[];

    @Column({ name: 'otpCreatedAt', type: 'timestamp', default: null, nullable: true })
    otpCreatedAt: Date;
}
