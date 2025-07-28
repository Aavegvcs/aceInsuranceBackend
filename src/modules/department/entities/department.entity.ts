import {
    BaseEntity,
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    BeforeInsert
} from 'typeorm';
import { Employee } from '@modules/employee/entities/employee.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Department extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true, nullable: false })
    name: string; // Unique department name

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;
    @Column({ nullable: true })
    description: string; // Optional department description

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
    createdBy: number;

    @ApiProperty({
        description: 'created By',
        example: ' created by logged in user Id'
    })
    @Column({ nullable: true })
    updatedBy: number;

    @OneToMany(() => Employee, (employee) => employee.department)
    employees: Employee[]; // A department can have multiple employees
}


