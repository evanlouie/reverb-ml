import { readFile } from "fs";
import "reflect-metadata";
import { Connection, createConnection } from "typeorm";
import { promisify } from "util";
import { AudioFile } from "./entity/AudioFile";
import { Label } from "./entity/Label";

export class Database {
  public static getConnection = async (): Promise<Connection> =>
    Database.connection
      ? Database.connection
      : (Database.connection = await createConnection({
          type: "sqljs",
          entities: [AudioFile, Label],
          synchronize: true,
          location: Database.dbLocation,
          autoSave: true,
        }));

  public static closeConnection = async () => Database.connection.close();

  public static exportDatabase = async (): Promise<Uint8Array> =>
    promisify(readFile)(Database.dbLocation);

  private static connection: Connection;
  private static dbLocation = "echoml-sqljs.db";
}
