import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AudioFile } from "./AudioFile";

@Entity()
export class Label {
  @PrimaryGeneratedColumn()
  public id!: number;

  @Column()
  public start!: number;

  @Column()
  public end!: number;

  @Column()
  public value!: string;

  @ManyToOne((type) => AudioFile, (file) => file.labels)
  public file!: AudioFile;
}
