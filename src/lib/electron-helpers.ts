/**
 * General Electron helper functions
 */
// tslint:disable-next-line
import { remote } from "electron"

/**
 * @see https://www.chromium.org/audio-video
 */
const supportedChromiumExtensions: string[] = [
  "flac",
  "mp4",
  "m4a",
  "mp3",
  "ogv",
  "ogm",
  "ogg",
  "oga",
  "opus",
  "webm",
  "wav",
]

export const selectFiles = (): Promise<string[]> =>
  new Promise((resolve) =>
    remote.dialog.showOpenDialog(
      // { properties: ["openFile", "openDirectory", "multiSelections"] },
      { properties: ["openFile", "multiSelections"] },
      (files) => resolve(files || []),
    ),
  )

/**
 * Show a single file selector with only Chromium supported media extensions
 */
export const selectMediaFile = ({ filter = (extension: string) => true } = {}): Promise<string[]> =>
  new Promise((resolve) =>
    remote.dialog.showOpenDialog(
      {
        properties: ["openFile"],
        filters: [
          {
            name: "Audio",
            extensions: supportedChromiumExtensions.filter(filter),
          },
        ],
      },
      (files) => resolve(files || []),
    ),
  )

/**
 * Show a file selector with only Chromium supported audio extensions.
 */
export const selectAudioFile = () =>
  selectMediaFile({
    filter: (ext) => ["mp4", "ogv", "webm"].includes(ext) === false,
  })

/**
 * @see https://github.com/electron/electron/blob/master/docs/api/app.md#appgetpathname
 */
export const getPath = (name: string): string => remote.app.getPath(name)
