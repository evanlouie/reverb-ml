import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@material-ui/core";
import React from "react";
import { Classification } from "../entities/Classification";

export class ClassificationFormDialog extends React.PureComponent {
  public state = {
    open: false,
    nameField: "",
  };

  public handleClickOpen = () => {
    this.setState({ open: true });
  };

  public handleClose = () => {
    this.setState({ open: false });
  };

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
            <Button onClick={this.handleCreate} color="primary">
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }

  private handleCreate = async () => {
    const classification = Classification.create({ name: this.state.nameField }).save();
    this.setState({ open: false, nameField: "" });
    return classification;
  };
}
