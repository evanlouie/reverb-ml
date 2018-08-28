import "reflect-metadata";
import { Connection, createConnection } from "typeorm";
import { AudioFile } from "./entity/AudioFile";
import { Label } from "./entity/Label";

export class Database {
  public static getConnection = async (): Promise<Connection> =>
    Database.connection
      ? Database.connection
      : (Database.connection = await createConnection({
          type: "sqljs",
          entities: [AudioFile, Label],
        }));

  private static connection: Connection;
}
