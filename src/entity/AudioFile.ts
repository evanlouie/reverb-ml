import { BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Label } from "./Label";

@Entity()
export class AudioFile extends BaseEntity {
  @PrimaryGeneratedColumn()
  public id!: number;

  @Column()
  public name: string = "";

  @Column()
  public size: number = -1;

  @Column()
  public duration: number = -1;

  @OneToMany((type) => Label, (label) => label.file)
  public labels!: Label[];
}
