import { BaseEntity, Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Label } from "./Label";

@Entity()
@Index(["basename", "dirname"], { unique: true })
export class AudioFile extends BaseEntity {
  @PrimaryGeneratedColumn()
  public id!: number;

  @Column()
  public basename!: string;

  @Column()
  public dirname!: string;

  @OneToMany((type) => Label, (label) => label.audioFile)
  public labels!: Label[];

  public async getLabels(): Promise<Label[]> {
    return Label.find({ audioFile: this });
  }
}
