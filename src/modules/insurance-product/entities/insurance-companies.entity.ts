import { InsuranceProduct } from '@modules/insurance-product/entities/insurance-product.entity';
import { User } from '@modules/user/user.entity';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    OneToMany,
    ManyToOne,
    JoinColumn
} from 'typeorm';

@Entity({ name: 'insurance_companies' })
export class InsuranceCompanies {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'company_name', nullable: false })
    companyName: string;

    @Column({ name: 'company_address', nullable: true })
    companyAddress: string;

    @Column({ name: 'contact_person', nullable: true })
    contactPerson: string;

    @Column({ name: 'contact_number', nullable: false })
    contactNumber: string;

    @Column({ name: 'email', unique: true, nullable: false })
    email: string;

    @Column({ name: 'secondary_contact_person', nullable: true })
    secondaryContactPerson: string;

    @Column({ name: 'secondary_contact_number', nullable: true })
    secondaryContactNumber: string;

    @Column({ name: 'secondary_email', nullable: true })
    secondaryEmail: string;

    @Column({ name: 'company_logo', nullable: true })
    companyLogo: string;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    createdBy: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'updated_by' })
    updatedBy: User;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: true })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
    deletedAt: Date;

    @OneToMany(() => InsuranceProduct, (product) => product.insuranceCompanyId)
    product: InsuranceProduct[];
}
