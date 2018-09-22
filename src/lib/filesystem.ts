import fs from "fs";
import { promisify } from "util";

/**
 * Read a file filesystem and return a Blob
 * @param filepath Full filepath of file to read
 */
export const readFileAsBlob = async (filepath: string): Promise<Blob> => {
  const buffer = await promisify(fs.readFile)(filepath);
  return new Response(buffer).blob();
};

export const readFileAsBuffer = async (filepath: string): Promise<Uint8Array> => {
  const buffer = await promisify(fs.readFile)(filepath);
  return buffer;
};
