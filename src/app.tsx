import { Grid } from "@material-ui/core";
import * as React from "react";
import { AudioPlayer } from "./components/AudioPlayer";
import { Database } from "./Database";
import { selectFiles } from "./lib";

export class App extends React.Component<undefined, undefined> {
  public async componentWillMount() {
    Database.getConnection().then((connection) => {
      console.info(connection);
    });
  }

  public async componentWillUnmount() {
    Database.closeConnection().then(() => console.info("Database connection closed."));
  }

  public openDialog = async () => {
    selectFiles().then((files) => console.log(files));
  };

  public render() {
    return (
      <div className="App">
        <Grid container spacing={24}>
          <Grid item xs={12}>
            <h2>Welcome to React with Typescript!</h2>
          </Grid>
          <Grid item xs={4}>
            <button
              onClick={() =>
                Database.isConnected().then((status) => console.log(`Connection status: ${status}`))
              }
            >
              Check DB Connection
            </button>
            <button onClick={this.openDialog}>File searcher</button>
          </Grid>
          <Grid item xs={12}>
            <AudioPlayer audioURL="file:///Users/evlouie/Music/ffvii.flac" />
          </Grid>
        </Grid>
      </div>
    );
  }
}
