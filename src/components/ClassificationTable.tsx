import { Table, TableBody, TableCell, TableHead, TableRow, Tooltip } from "@material-ui/core";
import React from "react";
import { Classification } from "../entities/Classification";
import { Label } from "../entities/Label";
import { getDBConnection } from "../lib/database";
import { ClassificationFormDialog } from "./ClassificationFormDialog";

export class ClassificationTable extends React.PureComponent<{}> {
  public state: {
    classifications: Classification[];
    labelCounts: { [classificationId: number]: number };
  } = {
    classifications: [],
    labelCounts: {},
  };

  public async componentDidMount() {
    await getDBConnection();
    const classifications = await Classification.find();
    classifications.forEach(async (classification) => {
      const labelCount = await Label.count({ classification });
      this.setState({
        labelCounts: { ...this.state.labelCounts, [classification.id]: labelCount },
      });
    });
    this.setState({ classifications });
  }

  public render() {
    const { classifications, labelCounts } = this.state;
    return (
      <div
        className="ClassificationTable"
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <Tooltip title="Add a Classification">
          <ClassificationFormDialog />
        </Tooltip>
        <div style={{ height: 0, flex: 1, overflow: "scroll" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Label Count</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {classifications.map(({ id, name }) => (
                <TableRow key={id}>
                  <TableCell>{id}</TableCell>
                  <TableCell>{name}</TableCell>
                  <TableCell>{labelCounts[id] || "---"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }
}
