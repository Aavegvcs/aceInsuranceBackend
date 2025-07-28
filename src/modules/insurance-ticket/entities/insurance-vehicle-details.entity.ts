import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';
import { User } from '@modules/user/user.entity';
import { InsuranceUser } from './insurance-user.entity';
import { InsuranceTicket } from './insurance-ticket.entity';
import { Vehicle_Type } from 'src/utils/app.utils';

@Entity('vehicle_details')
export class InsuranceVehicleDetails extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => InsuranceUser, (data) => data.vehicleDetails, { nullable: true })
    @JoinColumn({ name: 'insurance_user_id' })
    insuranceUserId: InsuranceUser;

    @ManyToOne(() => InsuranceTicket, { nullable: true })
    @JoinColumn({ name: 'ticket_id' })
    ticketId: InsuranceTicket;

    @Column({ type: 'enum', enum: Vehicle_Type, name: 'vehicle_type', nullable: false })
    vehicleType: Vehicle_Type;

    @Column({ name: 'vehicle_number', nullable: false })
    vehicleNumber: string;

    @Column({ name: 'rc_owner_name', nullable: true })
    rcOwnerName: string;

    @Column({ name: 'engine_number', nullable: true })
    engineNumber: string;

    @Column({ name: 'chassis_number', nullable: true })
    chassisNumber: string;

    @Column({ name: 'date_of_reg', nullable: true })
    dateOfReg: string;

    @Column({ name: 'made_by', nullable: true })
    madeBy: string;
    

    @Column({ name: 'making_year', nullable: true })
    makingYear: string;

    @Column({ name: 'vehicle_name', nullable: true })
    vehicleName: string;

    @Column({ name: 'model_number', nullable: true })
    modelNumber: string;

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

    @Column({ type: 'boolean', name: 'is_active', default: true })
    isActive: boolean;
}
