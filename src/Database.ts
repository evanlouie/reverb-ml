import { readFile } from "fs";
import "reflect-metadata";
import { Connection, createConnection } from "typeorm";
import { promisify } from "util";
import { AudioFile } from "./entity/AudioFile";
import { Label } from "./entity/Label";

export class Database {
  public static async getConnection(): Promise<Connection> {
    return Database.connection
      ? Database.connection
      : (this.connection = await createConnection({
          type: "sqljs",
          entities: [AudioFile, Label],
          synchronize: true,
          location: Database.dbLocation,
          autoSave: true,
        }));
  }

  public static async closeConnection() {
    const conn = await this.getConnection();
    conn.close();
  }

  public static async exportDatabase(): Promise<Uint8Array> {
    return promisify(readFile)(this.dbLocation);
  }

  public static async isConnected(): Promise<boolean> {
    return this.getConnection().then((con) => con.isConnected);
  }

  private static connection: Connection | undefined;
  private static dbLocation = "echoml-sqljs.db";
}
