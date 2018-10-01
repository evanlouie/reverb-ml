import { BaseEntity, Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class DataBlob extends BaseEntity {
  @PrimaryGeneratedColumn()
  public id!: number

  // Node `Buffer` implements JS TypedArray `Uint8Array`.
  // Buffer required type in order to properly serialize to DB drivers.
  // Will show up as Uint8Array in client
  @Column()
  public blob!: Buffer
}
