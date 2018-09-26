import { writeFile } from "fs";
import { ensureDir } from "fs-extra";
import path from "path";
import { BaseEntity, Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { promisify } from "util";
import { getPath } from "../lib/electron-helpers";
import { Label } from "./Label";

@Entity()
export class Classification extends BaseEntity {
  public static async export(classificationId: number) {
    const repository = this.getRepository();
    const classifications = await repository.find({
      relations: ["labels", "labels.sampleData", "labels.audioFile"],
      where: { id: classificationId },
    });
    const writes = await Promise.all(
      classifications
        .map((classification) => {
          return classification.labels.map(
            async ({ id: labelId, sampleData, audioFile: { basename } }) => {
              const writeOutDir = path.join(getPath("home"), "reverb-export", classification.name);
              await ensureDir(writeOutDir);
              const filename = `${basename}-${labelId}.wav`;
              const writePath = path.join(writeOutDir, filename);
              const buffer = sampleData.blob;
              await promisify(writeFile)(writePath, buffer);
              console.log(`Written: ${writePath}`);
              return writePath;
            },
          );
        })
        .reduce((flat, arr) => flat.concat(arr), []),
    );

    return writes;
  }

  @PrimaryGeneratedColumn()
  public id!: number;

  @Column({ unique: true })
  public name!: string;

  @OneToMany((type) => Label, (label) => label.classification)
  public labels!: Label[];
}
