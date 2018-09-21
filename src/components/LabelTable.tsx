import {
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
} from "@material-ui/core";
import { Delete, PlayArrow } from "@material-ui/icons";
import React from "react";
import { Label } from "../entities/Label";

interface ILabelTableProps {
  labels: Label[];
  playLabel: (label: Label) => void;
  deleteLabel: (label: Label) => void;
}

export class LabelTable extends React.PureComponent<ILabelTableProps> {
  public render() {
    const { labels } = this.props;
    return (
      <div className="LabelTable">
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Classifier</TableCell>
                <TableCell>Start (Seconds)</TableCell>
                <TableCell>End (Seconds)</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {labels.sort((a, b) => a.startTime - b.startTime).map(this.tableRow)}
            </TableBody>
          </Table>
        </Paper>
      </div>
    );
  }

  private tableRow = (label: Label) => {
    const {
      id,
      startTime,
      endTime,
      classification: { name },
    } = label;
    const { playLabel, deleteLabel } = this.props;
    return (
      <TableRow key={id}>
        <TableCell>{name}</TableCell>
        <TableCell>{startTime}</TableCell>
        <TableCell>{endTime}</TableCell>
        <TableCell>
          <Tooltip title="Play Label">
            <Button mini={true} color="primary" onClick={() => playLabel(label)}>
              <PlayArrow />
            </Button>
          </Tooltip>
          <Tooltip title="Delete Label">
            <Button mini={true} color="secondary" onClick={() => deleteLabel(label)}>
              <Delete />
            </Button>
          </Tooltip>
        </TableCell>
      </TableRow>
    );
  };
}
