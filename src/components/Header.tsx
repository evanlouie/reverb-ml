import { AppBar, IconButton, Toolbar, Typography } from "@material-ui/core"
import { Menu } from "@material-ui/icons"
import React from "react"

export const Header: React.StatelessComponent = () => (
  <AppBar position="static">
    <Toolbar>
      <IconButton color="inherit" aria-label="Menu">
        <Menu />
      </IconButton>
      <Typography variant="h6" color="inherit">
        ReverbML
      </Typography>
    </Toolbar>
  </AppBar>
)
