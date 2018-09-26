import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
} from "@material-ui/core";
import { SaveAlt } from "@material-ui/icons";
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
    this.refreshClassifications();
  }

  public render() {
    const { classifications, labelCounts } = this.state;
    return (
      <div
        className="ClassificationTable"
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <div style={{ display: "flex", flexDirection: "row", flexWrap: "nowrap" }}>
          <Tooltip title="Add a Classification">
            <ClassificationFormDialog />
          </Tooltip>
          <Tooltip title="Refresh table">
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => this.refreshClassifications()}
            >
              Refresh
            </Button>
          </Tooltip>
        </div>

        <div style={{ height: 0, flex: 1, overflow: "scroll" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Label Count</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {classifications.map(({ id, name }) => (
                <TableRow key={id}>
                  <TableCell>{id}</TableCell>
                  <TableCell>{name}</TableCell>
                  <TableCell>{labelCounts[id] || "---"}</TableCell>
                  <TableCell>
                    <Tooltip title={`Export all audio samples classified as: ${name}`}>
                      <Button
                        color="primary"
                        size="small"
                        onClick={() => Classification.export(id)}
                      >
                        <SaveAlt />
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  private refreshClassifications = async () => {
    const classifications = await Classification.find();
    classifications.forEach(async (classification) => {
      const labelCount = await Label.count({ classification });
      this.setState({
        labelCounts: { ...this.state.labelCounts, [classification.id]: labelCount },
      });
    });
    this.setState({ classifications });
    return classifications;
  };
}
