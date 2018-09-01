import { BaseEntity, Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Label } from "./Label";

@Entity()
export class Classification extends BaseEntity {
  @PrimaryGeneratedColumn()
  public id!: number;

  @Column({ unique: true })
  public name!: string;

  @OneToMany((type) => Label, (label) => label.classification)
  public labels!: Label[];
}
