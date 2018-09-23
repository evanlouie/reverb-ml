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
import React, { StatelessComponent } from "react";
import { Label } from "../entities/Label";
import { stringToRGBA } from "../lib/colour";

interface ILabelTableProps {
  labels: Label[];
  currentlyPlayingLabelIds: number[];
  playLabel: (label: Label) => void;
  deleteLabel: (label: Label) => void;
}
export class LabelTable extends React.PureComponent<ILabelTableProps> {
  public render() {
    const { labels, currentlyPlayingLabelIds } = this.props;
    return (
      <div className="LabelTable">
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
            {labels.sort((a, b) => a.startTime - b.startTime).map((label) => (
              <this.LabelTableRow
                key={label.id}
                label={label}
                isPlaying={currentlyPlayingLabelIds.includes(label.id)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  private LabelTableRow: StatelessComponent<{ label: Label; isPlaying?: boolean }> = ({
    label,
    isPlaying = false,
  }) => {
    const {
      startTime,
      endTime,
      classification: { name },
    } = label;
    const { playLabel, deleteLabel } = this.props;
    return (
      <TableRow selected={isPlaying}>
        <TableCell>
          <span style={{ color: stringToRGBA(name, { alpha: 1 }) }}>{name}</span>
        </TableCell>
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
