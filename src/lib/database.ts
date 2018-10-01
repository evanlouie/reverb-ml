import { join } from "path"
import { Connection, createConnection, getConnection, getConnectionOptions } from "typeorm"
import { AudioFile } from "../entities/AudioFile"
import { Classification } from "../entities/Classification"
import { DataBlob } from "../entities/DataBlob"
import { Label } from "../entities/Label"
import { getPath } from "./electron-helpers"

export const createDBConnection = async () =>
  createConnection({
    type: "sqlite",
    database: databasePath(),
    entities: [Label, Classification, AudioFile, DataBlob],
    synchronize: true,
  })
export const getDBConnection = async (): Promise<Connection> => getConnection()
export const closeDBConnection = async () => getDBConnection().then((conn) => conn.close())
export const databasePath = () => join(getPath("home"), "reverb.sqlite3")
