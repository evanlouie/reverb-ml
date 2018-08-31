// tslint:disable-next-line
import { remote } from "electron";

export const selectFiles = (): Promise<string[]> =>
  new Promise((resolve) =>
    remote.dialog.showOpenDialog(
      { properties: ["openFile", "openDirectory", "multiSelections"] },
      (files) => resolve(files),
    ),
  );

export const getPath = (name: string): string => remote.app.getPath(name);
