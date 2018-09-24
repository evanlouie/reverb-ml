import {
  Button,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
} from "@material-ui/core";
import { Delete, PlayArrow } from "@material-ui/icons";
import React, { StatelessComponent } from "react";
import { Classification } from "../entities/Classification";
import { Label } from "../entities/Label";
import { stringToRGBA } from "../lib/colour";

interface ILabelTableProps {
  labels: Label[];
  currentlyPlayingLabelIds: number[];
  playLabel: (label: Label) => Promise<any>;
  deleteLabel: (label: Label) => Promise<any>;
  updateLabelClassification: (label: Label, classification: Classification) => Promise<any>;
}
export class LabelTable extends React.PureComponent<ILabelTableProps> {
  public state = {
    classifications: Object.values(
      this.props.labels.reduce<{ [id: number]: Classification }>((classifications, label) => {
        return { ...classifications, [label.classification.id]: label.classification };
      }, {}),
    ),
  };

  private scrollIntoViewRefs: HTMLElement[] = [];

  public async componentDidMount() {
    const classifications = await Classification.find();
    this.setState({ classifications });
  }

  public async componentDidUpdate() {
    // Ensure the first label in always in view
    if (this.scrollIntoViewRefs.length > 0) {
      // behavior: "center" breaks scrollIntoView when having to scroll between many objects.
      this.scrollIntoViewRefs[0].scrollIntoView({ block: "center" });
    }
  }

  public render() {
    this.scrollIntoViewRefs = [];
    const { labels } = this.props;
    const currentlyPlayingLabelIds = new Set(this.props.currentlyPlayingLabelIds);
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
            {labels.map((label) => (
              <this.LabelTableRow
                key={label.id}
                label={label}
                isPlaying={currentlyPlayingLabelIds.has(label.id)}
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
    const { classifications } = this.state;
    return (
      <TableRow selected={isPlaying}>
        <TableCell>
          <span
            ref={(ref) => isPlaying && ref && this.scrollIntoViewRefs.push(ref)}
            style={{ color: stringToRGBA(name, { alpha: 1 }) }}
          >
            <this.ClassificationSelect {...{ classifications, label }} />
          </span>
        </TableCell>
        <TableCell>{startTime}</TableCell>
        <TableCell>{endTime}</TableCell>
        <TableCell>
          <div style={{ display: "flex", flexDirection: "row", flexWrap: "nowrap" }}>
            <Tooltip title="Play Label">
              <Button mini={true} color="primary" onClick={this.handlePlayLabel(label)}>
                <PlayArrow />
              </Button>
            </Tooltip>
            <Tooltip title="Delete Label">
              <Button mini={true} color="secondary" onClick={this.handleDeleteLabel(label)}>
                <Delete />
              </Button>
            </Tooltip>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  private handlePlayLabel = (label: Label) => (_: React.MouseEvent<HTMLElement>) =>
    this.props.playLabel(label);
  private handleDeleteLabel = (label: Label) => (_: React.MouseEvent<HTMLElement>) =>
    this.props.deleteLabel(label);

  private ClassificationSelect: StatelessComponent<{
    classifications: Classification[];
    label: Label;
  }> = ({ classifications, label }) => {
    const { id: classificationId } = label.classification;
    return (
      <Select
        native={true}
        value={classificationId}
        onChange={this.handleClassificationChange(label)}
      >
        {classifications.map((classification) => (
          <option key={classification.id} value={classification.id}>
            {classification.name}
          </option>
        ))}
      </Select>
    );
  };

  private handleClassificationChange = (label: Label) => async ({
    target: { value },
  }: React.ChangeEvent<HTMLSelectElement>) => {
    const classification = this.state.classifications.find((c) => c.id.toString() === value);
    if (classification) {
      console.info(
        `Updating label from classification ${label.classification.id} to ${classification.id}`,
      );
      await this.props.updateLabelClassification(label, classification);
      console.info("Updated label");
      return classification;
    } else {
      return Promise.reject(`Unable to find Classification with id ${label.classification.id}`);
    }
  };
}