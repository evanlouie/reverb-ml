import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AudioFile } from "./AudioFile";

@Entity()
export class Label extends BaseEntity {
  @PrimaryGeneratedColumn()
  public id!: number;

  @Column()
  public startTime!: number;

  @Column()
  public endTime!: number;

  @Column()
  public labelText!: string;

  @Column()
  public audioSegment!: Buffer; // Node Buffer implements JS TypedArray Uint8Array

  @ManyToOne((type) => AudioFile, (file) => file.labels)
  public audioFile!: AudioFile;
}
