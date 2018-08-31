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

  // Node `Buffer` implements JS TypedArray `Uint8Array`.
  // Buffer required type in order to properly serialize to DB drivers.
  // Will show up as Uint8Array in client
  @Column()
  public audioSegment!: Buffer;

  @ManyToOne((type) => AudioFile, (file) => file.labels)
  public audioFile!: AudioFile;
}
