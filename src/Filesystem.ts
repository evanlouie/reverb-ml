import fs from "fs";
import { promisify } from "util";

export class Filesystem {
  /**
   * Read a file filesystem and return a Blob
   * @param filepath Full filepath of file to read
   */
  public static async readFileAsBlob(filepath: string): Promise<Blob> {
    const buffer = await promisify(fs.readFile)(filepath);
    const blob = await new Response(buffer).blob();
    return blob;
  }
}
