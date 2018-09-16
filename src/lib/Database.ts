import { join } from "path";
import { Connection, createConnection, getConnection, getConnectionOptions } from "typeorm";
import { AudioFile } from "../entities/AudioFile";
import { Classification } from "../entities/Classification";
import { DataBlob } from "../entities/DataBlob";
import { Label } from "../entities/Label";
import { getPath } from "./electronHelpers";

export class Database {
  public static async createConnection() {
    return createConnection({
      type: "sqlite",
      database: this.databasePath(),
      entities: [Label, Classification, AudioFile, DataBlob],
      synchronize: true,
    });
  }

  public static async getConnection(): Promise<Connection> {
    return getConnection();
  }

  public static async closeConnection() {
    return this.getConnection().then((conn) => conn.close());
  }

  private static databasePath = () => join(getPath("home"), "reverb.sqlite3");
}
