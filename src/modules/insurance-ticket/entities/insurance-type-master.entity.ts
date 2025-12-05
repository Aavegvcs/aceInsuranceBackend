import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { InsuranceTicket } from "./insurance-ticket.entity";

@Entity('insurance_type_master')
export class InsuranceTypeMaster {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ default: true })
  isActive: boolean;
 @OneToMany(() => InsuranceTicket, (data) => data.insuranceTypes)
    insuranceTicket: InsuranceTicket[];
}
