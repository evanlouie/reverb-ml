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

export class ClassificationFormDialog extends React.PureComponent {
  public state = {
    open: false,
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
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleClose} color="primary">
              Cancel
            </Button>
            <Button onClick={this.handleClose} color="primary">
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }
}
