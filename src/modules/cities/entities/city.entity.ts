import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { State } from 'src/modules/states/entities/state.entity';
@Entity({ name: 'cities' })
export class City extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @ManyToOne(() => State, (state) => state.cities)
    @JoinColumn({ name: 'state' })
    state: State;
}
