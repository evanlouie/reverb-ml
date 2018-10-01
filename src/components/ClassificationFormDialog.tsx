import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@material-ui/core"
import React from "react"
import { NotificationContext } from "../contexts/NotificationContext"
import { Classification } from "../entities/Classification"

interface IClassificationFormDialogProps {
  afterCreate: (c: Classification) => Promise<any>
}

export class ClassificationFormDialog extends React.PureComponent<IClassificationFormDialogProps> {
  public state = {
    open: false,
    nameField: "",
  }

  public handleClickOpen = () => {
    this.setState({ open: true })
  }

  public handleClose = () => {
    this.setState({ open: false })
  }

  public render() {
    return (
      <div>
        <Button color="primary" variant="outlined" onClick={this.handleClickOpen}>
          Create Classification
        </Button>
        <Dialog open={this.state.open} onClose={this.handleClose}>
          <DialogTitle>Create Classification</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Enter a unique Classification name to add to the system.
            </DialogContentText>
            <TextField
              autoFocus={true}
              margin="dense"
              label="Classification/Label Name"
              type="text"
              fullWidth={true}
              onChange={({ target: { value: nameField } }) => this.setState({ nameField })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleClose} color="primary">
              Cancel
            </Button>
            <NotificationContext.Consumer>
              {({ notify }) => (
                <Button
                  onClick={async () => {
                    return Classification.create({
                      name: this.state.nameField,
                    })
                      .save()
                      .then((c) => {
                        this.setState({ open: false, nameField: "" })
                        notify(`Classification ${c.name} was successfully added.`)
                        return c
                      })
                      .then(this.props.afterCreate)
                      .catch((err) => {
                        notify(err)
                      })
                  }}
                  color="primary"
                >
                  Create
                </Button>
              )}
            </NotificationContext.Consumer>
          </DialogActions>
        </Dialog>
      </div>
    )
  }
}
