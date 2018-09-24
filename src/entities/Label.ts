import { writeFile } from "fs";
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { promisify } from "util";
import { AudioFile } from "./AudioFile";
import { Classification } from "./Classification";
import { DataBlob } from "./DataBlob";

@Entity()
export class Label extends BaseEntity {
  public static async exportLabels() {
    const labels = await Label.find();
    await promisify(writeFile)("db.json", JSON.stringify(labels), { encoding: "utf8" });
    console.log("WROTE OUT FILES");
  }

  @PrimaryGeneratedColumn()
  public id!: number;

  @Column()
  public startTime!: number;

  @Column()
  public endTime!: number;

  @ManyToOne((type) => Classification, (classification) => classification.labels, {
    nullable: false,
    eager: true,
  })
  public classification!: Classification;

  @OneToOne((type) => DataBlob, { nullable: false })
  @JoinColumn()
  public sampleData!: DataBlob;

  @ManyToOne((type) => AudioFile, (file) => file.labels, { nullable: false })
  public audioFile!: AudioFile;
}
