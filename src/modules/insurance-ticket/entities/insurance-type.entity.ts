import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Insurance_Type } from 'src/utils/app.utils';
@Entity('insurance_type')
export class InsuranceType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type:'enum',enum:Insurance_Type, nullable: false})
  type: Insurance_Type;
}
