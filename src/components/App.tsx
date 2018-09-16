import { Button, Grid, Typography } from "@material-ui/core";
import * as React from "react";
import { selectAudioFiles, selectFiles } from "../lib/electronHelpers";
import { Filesystem } from "../lib/Filesystem";
import { AudioPlayer, IAudioPlayerProps } from "./AudioPlayer";

interface IAppState {
  audioFiles: IAudioPlayerProps[];
}

const player = (props: IAudioPlayerProps) => (
  <Grid item xs={12} key={props.filepath}>
    <Typography variant="title" gutterBottom>
      {props.filepath}
    </Typography>
    <AudioPlayer {...props} />
  </Grid>
);

export class App extends React.PureComponent<any, IAppState> {
  constructor(props: any) {
    super(props);
    this.state = {
      audioFiles: [],
    };
  }

  public selectAudio = async () => {
    const filepaths = await selectAudioFiles();
    const audioFiles = await Promise.all(
      filepaths.map(async (filepath) => {
        const audioBlob = await Filesystem.readFileAsBlob(filepath);
        return {
          audioBlob,
          filepath,
        };
      }),
    );
    this.setState({ audioFiles });
  };

  public render() {
    const { audioFiles } = this.state;
    return (
      <div className="App" style={{ padding: 12 }}>
        <Grid container spacing={24}>
          <Grid item xs={12}>
            <Typography variant="display1" gutterBottom>
              ReverbML
            </Typography>
          </Grid>
          <Grid container>
            <Grid item xs={4}>
              <Button color="primary" onClick={this.selectAudio}>
                File searcher
              </Button>
            </Grid>
          </Grid>
          <Grid container>
            {audioFiles.length === 0 ? (
              <Grid item xs={12}>
                <Typography variant="body1">Select audio file before to begin labelling</Typography>
              </Grid>
            ) : (
              audioFiles.map(player)
            )}
          </Grid>
        </Grid>
      </div>
    );
  }
}
