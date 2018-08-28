import * as React from "react";
import { Database } from "./Database";

export class App extends React.Component<undefined, undefined> {
  public render() {
    Database.getConnection().then(console.log);
    return (
      <div>
        <h2>Welcome to React with Typescript!</h2>
      </div>
    );
  }
}
