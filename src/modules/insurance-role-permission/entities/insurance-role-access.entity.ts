import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Role } from '@modules/role/entities/role.entity';
import { User } from '@modules/user/user.entity';

@Entity({ name: 'insurance_role_access' })
@Unique(['role'])
export class InsuranceRoleAccess {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id',  })
  role: Role;

  @Column({ type: 'text' })
  permissions: string; // Store comma-separated IDs or JSON string (up to you)

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

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
