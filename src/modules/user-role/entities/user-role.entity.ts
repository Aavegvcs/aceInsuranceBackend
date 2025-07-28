import { ApiProperty } from '@nestjs/swagger';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryColumn,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';

@Entity({ name: 'user_role' })
export class UserRole {
    @PrimaryGeneratedColumn()
    id: number;
    
    @ApiProperty({
        description: 'Id of Role',
        example: 1
    })
    @PrimaryColumn({unique: true})
    userId: number;

    @ApiProperty({
        description: 'Id of Role',
        example: 1
    })
    @Column()
    roleId: number;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;
}
