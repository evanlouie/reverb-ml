import {
  Button,
  IconButton,
  List as MaterialList,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  ListSubheader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
} from "@material-ui/core"
import { Delete, PlayArrow } from "@material-ui/icons"
import { List, Set } from "immutable"
import React, { StatelessComponent } from "react"
import { Classification } from "../entities/Classification"
import { Label } from "../entities/Label"
import { stringToRGBA } from "../lib/colour"

export interface ILabelTableProps {
  labels: List<Label>
  currentlyPlayingLabelIds: Set<number>
  playLabel: (label: Label) => Promise<any>
  deleteLabel: (label: Label) => Promise<any>
  updateLabelClassification: (label: Label, classification: Classification) => Promise<any>
  compact?: boolean
}
export class LabelTable extends React.PureComponent<ILabelTableProps> {
  public state = {
    classifications: Object.values(
      this.props.labels.reduce<{ [id: number]: Classification }>((classifications, label) => {
        return { ...classifications, [label.classification.id]: label.classification }
      }, {}),
    ),
  }

  private scrollIntoViewRefs: HTMLElement[] = []

  public async componentDidMount() {
    const classifications = await Classification.find()
    this.setState({ classifications })
  }

  public async componentDidUpdate() {
    // Ensure the first label in always in view
    if (this.scrollIntoViewRefs.length > 0) {
      // behavior: "center" breaks scrollIntoView when having to scroll between many objects.
      this.scrollIntoViewRefs[0].scrollIntoView({ block: "center" })
    }
  }

  public render() {
    this.scrollIntoViewRefs = []
    const { labels, currentlyPlayingLabelIds, compact = false } = this.props
    return (
      <div className="LabelTable">
        {compact ? (
          <MaterialList dense={true}>
            <ListSubheader style={{ background: "white" }}>Labels</ListSubheader>
            {labels.size === 0 ? (
              <ListItem>
                <ListItemText primary="No labels found..." />
              </ListItem>
            ) : (
              labels.map((label) => (
                <this.LabelListItem
                  key={label.id}
                  label={label}
                  isPlaying={currentlyPlayingLabelIds.has(label.id)}
                />
              ))
            )}
          </MaterialList>
        ) : (
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
        )}
      </div>
    )
  }

  private LabelTableRow: StatelessComponent<{ label: Label; isPlaying?: boolean }> = ({
    label,
    isPlaying = false,
  }) => {
    const { startTime, endTime } = label
    const { classifications } = this.state
    return (
      <TableRow selected={isPlaying}>
        <TableCell>
          <span ref={(ref) => isPlaying && ref && this.scrollIntoViewRefs.push(ref)}>
            <ClassificationSelect
              {...{ classifications, label }}
              updateLabelClassification={this.props.updateLabelClassification}
            />
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
    )
  }

  private LabelListItem: StatelessComponent<{ label: Label; isPlaying?: boolean }> = ({
    label,
    isPlaying = false,
  }) => {
    const { startTime, endTime } = label
    const { classifications } = this.state

    return (
      <ListItem selected={isPlaying}>
        <ListItemText
          primary={
            <span ref={(ref) => isPlaying && ref && this.scrollIntoViewRefs.push(ref)}>
              <ClassificationSelect
                {...{ classifications, label }}
                updateLabelClassification={this.props.updateLabelClassification}
              />
            </span>
          }
          secondary={`${startTime} - ${endTime}`}
        />
        <ListItemSecondaryAction>
          <IconButton color="primary" onClick={this.handlePlayLabel(label)}>
            <PlayArrow />
          </IconButton>
          <IconButton color="secondary" onClick={this.handleDeleteLabel(label)}>
            <Delete />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>
    )
  }

  private handlePlayLabel = (label: Label) => (_: React.MouseEvent<HTMLElement>) =>
    this.props.playLabel(label)
  private handleDeleteLabel = (label: Label) => (_: React.MouseEvent<HTMLElement>) =>
    this.props.deleteLabel(label)
}

// A helper class so that we can use forceUpdate after updating the label.
// Modifying the Label Classification will not trigger a detected change in ImmutableJS as it is a
// nested object which is being changed.
// tslint:disable-next-line:max-classes-per-file
class ClassificationSelect extends React.PureComponent<{
  classifications: Classification[]
  label: Label
  updateLabelClassification: (label: Label, classification: Classification) => Promise<any>
}> {
  public render() {
    const { label, classifications } = this.props
    const { id: classificationId, name: classificationName } = label.classification
    return (
      <span style={{ display: "flex", flexWrap: "nowrap", alignItems: "center" }}>
        <select
          key="select"
          onChange={this.handleClassificationChange(label)}
          value={classificationId}
        >
          {classifications.map((classification) => (
            <option key={classification.id} value={classification.id}>
              {classification.name}
            </option>
          ))}
        </select>
        <span
          key="color-indicator"
          style={{ color: stringToRGBA(classificationName, { alpha: 1 }) }}
        >
          ●
        </span>
      </span>
    )
  }

  private handleClassificationChange = (label: Label) => async ({
    target: { value },
  }: React.ChangeEvent<HTMLSelectElement>) => {
    const classification = this.props.classifications.find((c) => c.id.toString() === value)
    if (classification) {
      console.info(
        `Updating label from classification ${label.classification.id} to ${classification.id}`,
      )
      this.props.updateLabelClassification(label, classification).then(() => {
        this.forceUpdate()
      })
      return classification
    } else {
      return Promise.reject(`Unable to find Classification with id ${label.classification.id}`)
    }
  }
}
