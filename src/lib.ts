// tslint:disable-next-line
import { remote } from "electron";

export const selectFiles = (): Promise<string[]> =>
  new Promise((resolve) =>
    remote.dialog.showOpenDialog(
      // { properties: ["openFile", "openDirectory", "multiSelections"] },
      { properties: ["openFile", "multiSelections"] },
      (files) => resolve(files),
    ),
  );

/**
 * Show a file selector with only Chromium supported audio extensions.
 * @see https://www.chromium.org/audio-video
 */
export const selectAudioFiles = (): Promise<string[]> =>
  new Promise((resolve) =>
    remote.dialog.showOpenDialog(
      {
        properties: ["openFile", "multiSelections"],
        filters: [
          {
            name: "Audio",
            extensions: [
              "flac",
              // "mp4",
              "m4a",
              "mp3",
              // "ogv",
              "ogm",
              "ogg",
              "oga",
              "opus",
              // "webm",
              "wav",
            ],
          },
        ],
      },
      (files) => resolve(files),
    ),
  );

export const getPath = (name: string): string => remote.app.getPath(name);
