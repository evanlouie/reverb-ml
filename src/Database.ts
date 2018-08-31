import { join } from "path";
import "reflect-metadata";
import { Connection, createConnection, getConnection, getConnectionOptions } from "typeorm";
import { getPath } from "./lib";

export class Database {
  public static async createConnection() {
    const connectionOptions = Object.assign(await getConnectionOptions(), {
      database: this.databasePath(),
    });
    return createConnection(connectionOptions);
  }

  public static async getConnection(): Promise<Connection> {
    return getConnection();
  }

  public static async closeConnection() {
    return this.getConnection().then((conn) => conn.close());
  }

  private static databasePath = () => join(getPath("home"), "reverb.sqlite3");
}
