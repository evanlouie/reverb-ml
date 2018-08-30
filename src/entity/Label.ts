import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AudioFile } from "./AudioFile";

@Entity()
export class Label extends BaseEntity {
  @PrimaryGeneratedColumn()
  public id!: number;

  @Column()
  public start: number = -1;

  @Column()
  public end: number = -1;

  @Column()
  public value: string = "";

  @ManyToOne((type) => AudioFile, (file) => file.labels)
  public file: AudioFile | undefined;
}
