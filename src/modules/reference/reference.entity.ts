import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    BeforeInsert
} from 'typeorm';
@Entity('reference', { schema: 'public' })
export class Reference {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    refType: string;

    @CreateDateColumn({ type: 'timestamp', default: null, nullable: true })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updatedAt', default: () => 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' }) // Set default to current timestamp with timezone
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deletedAt', nullable: true })
    deletedAt: Date | null;

    @BeforeInsert()
    updateTimestamps() {
        this.createdAt = new Date(Date.now());
    }
}
