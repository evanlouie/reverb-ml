import { Button, Grid, Typography } from "@material-ui/core";
import * as React from "react";
import { AudioPlayer } from "./components/AudioPlayer";
import { Filesystem } from "./Filesystem";
import { selectAudioFiles, selectFiles } from "./lib";

interface IAppState {
  audioFilePaths: string[];
  audioFiles: { [systemFilepath: string]: string }; // value == local blob URL
}

const player = (audioPath: string) => (
  <Grid item xs={12} key={audioPath}>
    <Typography variant="title" gutterBottom>
      {audioPath}
    </Typography>
    <AudioPlayer audioURL={audioPath} />
  </Grid>
);

export class App extends React.PureComponent<any, IAppState> {
  constructor(props: any) {
    super(props);
    this.state = {
      audioFiles: {},
      audioFilePaths: [],
    };
  }

  public openDialog = async () => {
    const files = await selectAudioFiles();
    const blobs = await Promise.all(files.slice(0, 3).map(Filesystem.readFileAsBlob));
    const fileUrls = blobs.map(URL.createObjectURL);
    this.setState({ audioFilePaths: fileUrls });
  };

  public render() {
    const { audioFilePaths } = this.state;
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
              <Button color="primary" onClick={this.openDialog}>
                File searcher
              </Button>
            </Grid>
          </Grid>
          <Grid container>
            {audioFilePaths.length === 0 ? (
              <Grid item xs={12}>
                <Typography variant="body1">Select audio file before to begin labelling</Typography>
              </Grid>
            ) : (
              audioFilePaths.map(player)
            )}
          </Grid>
        </Grid>
      </div>
    );
  }
}
