import { readFile } from "fs";
import "reflect-metadata";
import { Connection, createConnection, getConnection } from "typeorm";
import { promisify } from "util";
import { AudioFile } from "./entities/AudioFile";
import { Label } from "./entities/Label";

export class Database {
  public static createConnection() {
    return createConnection();
  }

  public static async getConnection(): Promise<Connection> {
    return getConnection();
  }

  public static async closeConnection() {
    return this.getConnection().then((conn) => conn.close());
  }
}
