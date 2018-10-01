import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm"
import { AudioFile } from "./AudioFile"
import { Classification } from "./Classification"
import { DataBlob } from "./DataBlob"

@Entity()
export class Label extends BaseEntity {
  @PrimaryGeneratedColumn()
  public id!: number

  @Column()
  public startTime!: number

  @Column()
  public endTime!: number

  @ManyToOne((type) => Classification, (classification) => classification.labels, {
    nullable: false,
    eager: true,
    onDelete: "CASCADE",
  })
  public classification!: Classification

  @OneToOne((type) => DataBlob, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn()
  public sampleData!: DataBlob

  @ManyToOne((type) => AudioFile, (file) => file.labels, { nullable: false })
  public audioFile!: AudioFile
}
