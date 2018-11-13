import {
  AppBar,
  Button,
  Dialog,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Toolbar,
  Tooltip,
  Typography,
} from "@material-ui/core"
import { Close, Delete, OpenInNew, SaveAlt } from "@material-ui/icons"
import { List, Map, Set } from "immutable"
import React from "react"
import { NotificationContext } from "../contexts/NotificationContext"
import { Classification } from "../entities/Classification"
import { Label } from "../entities/Label"
import { getDBConnection } from "../lib/database"
import { ClassificationFormDialog } from "./ClassificationFormDialog"
import { LabelTable } from "./LabelTable"

interface IState {
  classifications: List<Classification>
  labelCounts: Map<number, number>
  expandedClassification: number
}
export class ClassificationTable extends React.PureComponent<{}, IState> {
  public state: IState = {
    classifications: List(),
    labelCounts: Map(),
    expandedClassification: -1,
  }

  public async componentDidMount() {
    await getDBConnection()
    this.refreshClassifications()
  }

  public render() {
    const { classifications, labelCounts } = this.state
    return (
      <div
        className="ClassificationTable"
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <div style={{ display: "flex", flexDirection: "row", flexWrap: "nowrap" }}>
          <Tooltip title="Add a Classification">
            <ClassificationFormDialog afterCreate={(_) => this.refreshClassifications()} />
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
              {classifications.map((classification) => {
                const { id, name } = classification
                return (
                  <TableRow key={id}>
                    <TableCell>{id}</TableCell>
                    <TableCell>{name}</TableCell>
                    <TableCell>{labelCounts.get(id, "---")}</TableCell>
                    <TableCell>
                      <NotificationContext.Consumer>
                        {({ notify }) => (
                          <div
                            style={{ display: "flex", flexDirection: "row", flexWrap: "nowrap" }}
                          >
                            <Tooltip title={`Export all audio samples classified as: ${name}`}>
                              <Button
                                color="primary"
                                size="small"
                                onClick={() => {
                                  Classification.export(id)
                                  notify(
                                    `Classification ${classification.name} successfully exported.`,
                                  )
                                }}
                              >
                                <SaveAlt />
                              </Button>
                            </Tooltip>
                            <Tooltip
                              title={`Delete the ${name} Classification. Warning! will delete all associated labels.`}
                            >
                              <Button
                                color="secondary"
                                size="small"
                                onClick={async () => {
                                  await classification.remove()
                                  this.refreshClassifications()
                                  notify(
                                    `Classification "${
                                      classification.name
                                    }" and all associated labels have been deleted.`,
                                  )
                                }}
                              >
                                <Delete />
                              </Button>
                            </Tooltip>
                            <Tooltip title={`View labels classified as ${name}`}>
                              <LabelTableModal
                                classification={classification}
                                onClose={() => this.refreshClassifications()}
                              />
                            </Tooltip>
                          </div>
                        )}
                      </NotificationContext.Consumer>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  private refreshClassifications = async () => {
    const classifications = await Classification.find()
    classifications.forEach(async (classification) => {
      Label.count({ classification }).then((labelCount) => {
        this.setState({ labelCounts: this.state.labelCounts.set(classification.id, labelCount) })
      })
    })
    this.setState({ classifications: this.state.classifications.clear().concat(classifications) })
    return classifications
  }
}

// tslint:disable-next-line:max-classes-per-file
class LabelTableModal extends React.PureComponent<{
  classification: Classification
  onClose?: () => Promise<any>
}> {
  public static defaultProps = {
    onClose: async () => "",
  }

  public state: { isOpen: boolean; labels: List<Label>; currentlyPlayingLabelIds: Set<number> } = {
    isOpen: false,
    labels: List(),
    currentlyPlayingLabelIds: Set(),
  }

  public async componentDidMount() {
    const { classification } = this.props
    const labels = await Label.getRepository().find({
      where: { classification },
      relations: ["audioFile"],
    })
    this.setState({ labels: List(labels) })
  }

  public render() {
    const {
      classification: { name },
    } = this.props
    const { isOpen, labels, currentlyPlayingLabelIds } = this.state
    return (
      <div className="LabelTableModal">
        <Button color="primary" size="small" onClick={async () => this.setState({ isOpen: true })}>
          <OpenInNew />
        </Button>
        <Dialog fullScreen={true} open={isOpen} onClose={this.handleClose}>
          <AppBar>
            <Toolbar>
              <IconButton color="inherit" onClick={this.handleClose} aria-label="Close">
                <Close />
              </IconButton>
              <Typography variant="h6" color="inherit">
                {name}
              </Typography>
            </Toolbar>
          </AppBar>
          <div style={{ paddingTop: "4em" }}>
            <LabelTable
              labels={labels}
              currentlyPlayingLabelIds={currentlyPlayingLabelIds}
              playLabel={async (label: Label) => {
                Label.playAudio(label.id)
              }}
              deleteLabel={async (targetLabel: Label) => {
                Label.getRepository()
                  .find({ relations: ["sampleData"], where: { id: targetLabel.id } })
                  .then((labelsWithSample) => {
                    labelsWithSample.forEach((labelWithSample) => {
                      const { sampleData } = labelWithSample
                      labelWithSample
                        .remove()
                        .then((_) => sampleData.remove())
                        .then((_) => {
                          this.setState({
                            labels: this.state.labels.filter((l) => l.id !== targetLabel.id),
                          })
                        })
                    })
                  })
              }}
              updateLabelClassification={async (
                targetLabel: Label,
                classification: Classification,
              ) => {
                Label.getRepository()
                  .find({ where: { id: targetLabel.id } })
                  .then((matchingLabels) => {
                    matchingLabels.forEach((label) => {
                      label.classification = classification
                      label.save().then((updatedLabel) => {
                        this.setState({
                          labels: this.state.labels.filter((l) => l.id !== updatedLabel.id),
                        })
                      })
                    })
                  })
              }}
            />
          </div>
        </Dialog>
      </div>
    )
  }

  private handleClose = () => {
    this.setState(
      {
        isOpen: false,
      },
      () => {
        const { onClose } = this.props
        if (onClose) {
          onClose()
        }
      },
    )
  }
}
