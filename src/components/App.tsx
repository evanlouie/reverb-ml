import { Button, Tooltip, Typography } from "@material-ui/core";
import React from "react";
import { AudioFile } from "../entities/AudioFile";
import { selectAudioFile, selectAudioFiles } from "../lib/electron-helpers";
import { readFileAsBlob } from "../lib/filesystem";
import { AudioPlayer, IAudioPlayerProps } from "./AudioPlayer";
import { Header } from "./Header";

interface IAppState {
  audioFiles: IAudioPlayerProps[];
}

export class App extends React.Component<any, IAppState> {
  public state: IAppState = {
    audioFiles: [],
  };

  public render() {
    const { audioFiles } = this.state;
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
          <Button
            color="secondary"
            onClick={this.selectAudio}
            fullWidth={true}
            size="small"
            disabled={true}
          >
            Classifications
          </Button>
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
              onClick={AudioFile.exportAllLabels}
              fullWidth={true}
              size="small"
            >
              Export All Labels
            </Button>
          </Tooltip>
        </nav>

        <main className="main" style={{ gridArea: "main", marginRight: "1em" }}>
          {audioFiles.map((audioFile) => (
            <div key={audioFile.filepath} style={{ height: "100%" }}>
              <Typography variant="title" gutterBottom={true}>
                {audioFile.filepath}
              </Typography>
              <AudioPlayer key={audioFile.filepath} {...audioFile} />
            </div>
          ))}
          {audioFiles.length === 0 && (
            <Typography variant="body1">Select audio file before to begin labelling</Typography>
          )}
        </main>
      </div>
    );
  }

  private selectAudio = async () => {
    const filepaths = await selectAudioFile();
    const audioFiles: IAudioPlayerProps[] = await Promise.all(
      filepaths.map(async (filepath) => {
        const audioBlob = await readFileAsBlob(filepath);
        return {
          audioBlob,
          filepath,
        };
      }),
    );
    this.setState({ audioFiles });
  };
}
