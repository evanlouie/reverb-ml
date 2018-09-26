import { Button, Snackbar, Tooltip, Typography } from "@material-ui/core";
import React from "react";
import { AudioFile } from "../entities/AudioFile";
import { selectMediaFile } from "../lib/electron-helpers";
import { readFileAsBlob } from "../lib/filesystem";
import { AudioPlayer, IAudioPlayerProps } from "./AudioPlayer";
import { ClassificationTable } from "./ClassificationTable";
import { Header } from "./Header";

interface IAppState {
  mediaFiles: IAudioPlayerProps[];
  currentPage?: "player" | "classifications" | "labels";
  snackBarOpen: boolean;
  snackBarText: string;
}

export class App extends React.Component<any, IAppState> {
  public state: IAppState = {
    mediaFiles: [],
    snackBarOpen: false,
    snackBarText: "",
  };

  public render() {
    const { mediaFiles, currentPage } = this.state;
    return (
      <div
        className="App"
        style={{
          height: "100vh",
          maxHeight: "100vh",
          width: "100vw",
          display: "grid",
          gridGap: "1em",
          gridTemplateColumns: "2fr 10fr",
          gridTemplateRows: "1fr 11fr",
          gridTemplateAreas: `"header header" "sidebar main"`,
        }}
      >
        <header className="header" style={{ gridArea: "header" }}>
          <Header />
        </header>

        <nav
          className="sidebar"
          style={{ gridArea: "sidebar", borderRight: "1px lightgrey solid" }}
        >
          <Tooltip title="Browse filesystem for valid audio files">
            <Button color="primary" onClick={this.selectAudio} fullWidth={true} size="small">
              Label Audio File
            </Button>
          </Tooltip>
          <Tooltip title="Manage Classifications in system">
            <Button
              color="primary"
              onClick={() => {
                this.setState({ currentPage: "classifications" });
              }}
              fullWidth={true}
              size="small"
            >
              Classifications
            </Button>
          </Tooltip>

          <Button
            color="secondary"
            onClick={this.selectAudio}
            fullWidth={true}
            size="small"
            disabled={true}
          >
            Labels
          </Button>
          <Tooltip title="Export all labels to ~/reverb-export">
            <Button
              color="secondary"
              onClick={() =>
                AudioFile.exportAllLabels().then((paths) =>
                  this.setState({
                    snackBarOpen: true,
                    snackBarText: `${paths.length} files exported.`,
                  }),
                )
              }
              fullWidth={true}
              size="small"
            >
              Export All Labels
            </Button>
          </Tooltip>
        </nav>

        <main className="main" style={{ gridArea: "main", marginRight: "1em" }}>
          {currentPage === "player" &&
            mediaFiles.map((audioFile) => <AudioPlayer key={audioFile.filepath} {...audioFile} />)}
          {currentPage === "classifications" && <ClassificationTable />}
          {!currentPage && (
            <Typography variant="body1">Select audio file before to begin labelling</Typography>
          )}
        </main>
        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          open={this.state.snackBarOpen}
          onClose={() => this.setState({ snackBarOpen: false })}
          message={<span>{this.state.snackBarText}</span>}
        />
      </div>
    );
  }

  private selectAudio = async () => {
    const filepaths = await selectMediaFile();
    const mediaFiles: IAudioPlayerProps[] = await Promise.all(
      filepaths.map(async (filepath) => {
        const audioBlob = await readFileAsBlob(filepath);
        return {
          audioBlob,
          filepath,
        };
      }),
    );
    if (mediaFiles.length > 0) {
      this.setState({ mediaFiles, currentPage: "player" });
    } else {
      this.setState({ currentPage: undefined });
    }
  };
}
