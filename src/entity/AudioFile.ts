import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Label } from "./Label";

@Entity()
export class AudioFile {
  @PrimaryGeneratedColumn()
  public id!: number;

  @Column()
  public name!: string;

  @Column()
  public size!: number;

  @Column()
  public duration!: number;

  @OneToMany((type) => Label, (label) => label.file)
  public labels!: Label[];
}
