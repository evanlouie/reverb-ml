import { Button, Snackbar, Tooltip, Typography } from "@material-ui/core"
import { List } from "immutable"
import React from "react"
import { NotificationContext } from "../contexts/NotificationContext"
import { AudioFile } from "../entities/AudioFile"
import { selectMediaFile } from "../lib/electron-helpers"
import { readFileAsBlob } from "../lib/filesystem"
import { AudioPlayer, IAudioPlayerProps } from "./AudioPlayer"
import { ClassificationTable } from "./ClassificationTable"
import { Header } from "./Header"

interface IAppState {
  mediaFiles: List<IAudioPlayerProps>
  currentPage?: "player" | "classifications" | "labels"
  errors: List<string>
}

const defaultState: IAppState = {
  mediaFiles: List(),
  errors: List(),
}

export class App extends React.PureComponent<any, IAppState> {
  public state: IAppState = defaultState

  public componentDidCatch(error: Error | null, info: object) {
    console.log(error, info)
    this.setState({ errors: this.state.errors.concat(String(error)) })
  }

  public render() {
    const { mediaFiles, currentPage, errors } = this.state
    return (
      <NotificationContext>
        {/* Show Errors */}
        <NotificationContext.Consumer>
          {({ notify }) => {
            errors.forEach((error, index) => {
              notify(error)
              this.setState({ errors: errors.delete(index) })
            })
            return <span />
          }}
        </NotificationContext.Consumer>
        <div
          className="App"
          style={{
            height: "100vh",
            maxHeight: "100vh",
            width: "100vw",
            display: "grid",
            gridGap: "1em",
            gridTemplateColumns: "2fr 10fr",
            gridTemplateRows: "1fr 11fr",
            gridTemplateAreas: `"header header" "sidebar main"`,
          }}
        >
          <header className="header" style={{ gridArea: "header" }}>
            <Header />
          </header>

          <nav
            className="sidebar"
            style={{ gridArea: "sidebar", borderRight: "1px lightgrey solid" }}
          >
            <Tooltip title="Browse filesystem for valid media files">
              <Button color="primary" onClick={this.selectAudio} fullWidth={true} size="small">
                Label Audio/Video File
              </Button>
            </Tooltip>
            <Tooltip title="Manage Classifications in system">
              <Button
                color="primary"
                onClick={() => {
                  this.setState({ currentPage: "classifications" })
                }}
                fullWidth={true}
                size="small"
              >
                Classifications
              </Button>
            </Tooltip>
            <NotificationContext.Consumer>
              {({ notify }) => (
                <Tooltip title="Export all labels to ~/reverb-export">
                  <Button
                    color="secondary"
                    onClick={() =>
                      AudioFile.exportAllLabels().then((paths) =>
                        notify(`${paths.length} files exported.`),
                      )
                    }
                    fullWidth={true}
                    size="small"
                  >
                    Export All Labels
                  </Button>
                </Tooltip>
              )}
            </NotificationContext.Consumer>
          </nav>

          <main className="main" style={{ gridArea: "main", marginRight: "1em" }}>
            {currentPage === "player" &&
              mediaFiles.map((audioFile) => (
                <AudioPlayer key={audioFile.filepath} {...audioFile} />
              ))}
            {currentPage === "classifications" && <ClassificationTable />}
            {!currentPage && (
              <Typography variant="body2">Select audio file before to begin labelling</Typography>
            )}
          </main>
          <NotificationContext.Consumer>
            {({ isOpen, text, close }) => (
              <Snackbar
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                open={isOpen}
                onClose={close}
                message={<span>{text}</span>}
              />
            )}
          </NotificationContext.Consumer>
        </div>
      </NotificationContext>
    )
  }

  private selectAudio = async () => {
    const filepaths = await selectMediaFile()
    const mediaFiles: IAudioPlayerProps[] = await Promise.all(
      filepaths.map(async (filepath) => {
        const audioBlob = await readFileAsBlob(filepath)
        return {
          audioBlob,
          filepath,
        }
      }),
    )
    this.setState({
      mediaFiles: this.state.mediaFiles.clear().concat(mediaFiles),
      currentPage: mediaFiles.length > 0 ? "player" : undefined,
    })
  }
}
