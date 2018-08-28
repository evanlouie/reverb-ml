import { Grid } from "@material-ui/core";
import * as React from "react";
import { Database } from "./Database";
import { selectFiles } from "./lib";

export class App extends React.Component<undefined, undefined> {
  public async componentWillMount() {
    const connection = await Database.getConnection();
    console.log(connection);
  }

  public async componentWillUnmount() {
    await Database.closeConnection();
  }

  public openDialog: React.MouseEventHandler = async () => {
    const files = await selectFiles();
    console.log(files);
  };

  public render() {
    return (
      <div className="App">
        <Grid container spacing={24}>
          <h2>Welcome to React with Typescript!</h2>
          <button onClick={this.openDialog}>File searcher</button>
        </Grid>
      </div>
    );
  }
}
