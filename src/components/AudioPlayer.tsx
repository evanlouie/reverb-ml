import { Button, LinearProgress, Paper, Select, Tooltip } from "@material-ui/core"
import {
  AddComment,
  CloudDownload,
  FastForward,
  FastRewind,
  GraphicEq,
  Pause,
  PlayArrowRounded,
  Save,
  ZoomIn,
  ZoomOut,
} from "@material-ui/icons"
import { Buffer } from "buffer"
import { List, Map, Range, Set } from "immutable"
import * as mm from "music-metadata"
import { basename, dirname } from "path"
import React from "react"
import WaveSurfer, { WaveSurferInstance } from "wavesurfer.js"
import MinimapPlugin from "wavesurfer.js/dist/plugin/wavesurfer.minimap.js"
import RegionsPlugin, {
  Region,
  WaveSurferRegions,
} from "wavesurfer.js/dist/plugin/wavesurfer.regions.js"
import SpectrogramPlugin from "wavesurfer.js/dist/plugin/wavesurfer.spectrogram.js"
import TimelinePlugin from "wavesurfer.js/dist/plugin/wavesurfer.timeline.js"
import { NotificationContext } from "../contexts/NotificationContext"
import { AudioFile } from "../entities/AudioFile"
import { Classification } from "../entities/Classification"
import { DataBlob } from "../entities/DataBlob"
import { Label } from "../entities/Label"
import { sliceAudioBuffer } from "../lib/audio"
import { stringToRGBA } from "../lib/colour"
import { getDBConnection } from "../lib/database"
import { WavAudioEncoder } from "../lib/WavAudioEncoder"
import { LabelTable } from "./LabelTable"

export interface IAudioPlayerProps {
  audioBlob: Blob
  filepath: string // actual location on filesystem
}

interface IAudioPlayerState {
  audioBuffer_: Promise<AudioBuffer>
  audioFile_: Promise<AudioFile>
  audioSampleRate_: Promise<number>
  audioUrl: string
  classification: string
  classifications: List<Classification>
  currentlyPlayingLabelIds: Set<number>
  isLoading: boolean
  isPlaying: boolean
  labels: List<Label>
  playbackRate: number
  wavesurfer?: WaveSurferInstance & WaveSurferRegions
  wavesurferRegionIdToLabelIdMap: Map<string | number, number>
  zoom: number
}

export class AudioPlayer extends React.PureComponent<IAudioPlayerProps, IAudioPlayerState> {
  private static async getRecord(filepath: string): Promise<AudioFile> {
    const props = {
      dirname: dirname(filepath),
      basename: basename(filepath),
    }
    return getDBConnection().then(async (_) => {
      return AudioFile.findOne(props).then((record) => record || AudioFile.create(props).save())
    })
  }

  public state: IAudioPlayerState = {
    audioBuffer_: new Response(this.props.audioBlob)
      .arrayBuffer()
      .then((buffer) => new AudioContext().decodeAudioData(buffer))
      .then(({ numberOfChannels }) => {
        const arrayBuffer_ = new Response(this.props.audioBlob).arrayBuffer()
        return Promise.all([arrayBuffer_, this.state.audioSampleRate_]).then(
          ([arrayBuffer, sampleRate]) => {
            return new OfflineAudioContext(
              numberOfChannels,
              sampleRate * 60,
              sampleRate,
            ).decodeAudioData(arrayBuffer)
          },
        )
      }),
    audioFile_: AudioPlayer.getRecord(this.props.filepath),
    audioSampleRate_: mm
      .parseFile(this.props.filepath)
      .then((metadata) => metadata.format.sampleRate || 44100),
    audioUrl: URL.createObjectURL(this.props.audioBlob),
    classification: "default",
    classifications: List(),
    currentlyPlayingLabelIds: Set(),
    isLoading: true,
    isPlaying: false,
    labels: List(),
    playbackRate: 1,
    wavesurferRegionIdToLabelIdMap: Map(),
    zoom: 50,
  }

  /**
   * DOM refs to keep track of elements for WaveSurfer to mount
   */
  private videoRef = React.createRef<HTMLVideoElement>()
  private wavesurferContainerRef = React.createRef<HTMLDivElement>()
  private timelineRef = React.createRef<HTMLDivElement>()
  private spectrogramRef = React.createRef<HTMLDivElement>()

  /**
   * On initial mount, initialize PeaksJS into DOM
   */
  public async componentDidMount() {
    const { audioFile_, zoom: minPxPerSec, audioUrl, classifications, labels } = this.state

    // Mute video
    this.videoElement()
      .then((element) => {
        element.volume = 0
      })
      .catch(console.info)

    Classification.find().then((classificationsArr) => {
      const allClassifications = classifications.concat(classificationsArr)
      this.setState({
        classifications: allClassifications,
        classification: allClassifications.first({ name: "default" }).name,
      })
    })
    audioFile_.then((audioFile) => {
      audioFile
        .getLabels()
        .then((unsorted) => unsorted.sort((a, b) => a.startTime - b.startTime))
        .then((sortedLabels) => {
          const regions = sortedLabels.map(
            ({ id, startTime: start, endTime: end, classification: { name: labelName } }) => ({
              id,
              start,
              end,
              color: stringToRGBA(labelName),
            }),
          )

          // Only after ready we should bind region handlers to avoid duplicating already create labels
          const wavesurfer = this.mountWavesurferEvents(WaveSurfer.create({
            container: this.wavesurferContainerRef.current as HTMLDivElement,
            hideScrollbar: false,
            loopSelection: true,
            minPxPerSec,
            progressColor: "purple",
            responsive: true,
            scrollParent: true,
            waveColor: "violet",
            plugins: [
              TimelinePlugin.create({ container: this.timelineRef.current as HTMLDivElement }),
              MinimapPlugin.create(),
              RegionsPlugin.create({ dragSelection: true, regions }),
            ],
          }) as WaveSurferInstance & WaveSurferRegions)

          // Load media
          wavesurfer.load(audioUrl)
          this.setState({
            wavesurfer,
            labels: labels.concat(sortedLabels),
            wavesurferRegionIdToLabelIdMap: regions.reduce(
              (carry, { id: regionId }) => carry.set(regionId, regionId),
              Map<string | number, number>(),
            ),
          })
        })
    })
  }

  /**
   * Ensure Peaks is destroyed before unmounting (memory leaks).
   */
  public async componentWillUnmount() {
    const w = await this.wavesurfer()
    w.destroy()
  }

  public render() {
    const { wavesurfer, classifications, audioUrl, isPlaying } = this.state
    const maxWidthRefStyles = { width: "100%", minWidth: "20vw" }
    const isVideo = this.isVideoFile(this.props.filepath)
    const classificationOption = ({ id, name }: Classification) => (
      <option key={id} value={name}>
        {name}
      </option>
    )
    return (
      <div
        className="AudioPlayer"
        style={{
          display: "flex",
          flexDirection: isVideo ? "row" : "column",
          height: "100%",
        }}
        onKeyPress={() => console.log("KEY PRESSED")}
      >
        {/* <Typography variant="title" gutterBottom={true}>
          {this.props.filepath}
        </Typography> */}
        <div
          style={{
            flex: isVideo ? "2" : "1",
            paddingBottom: "5px",
            marginBottom: "5px",
          }}
        >
          <Paper>
            <Tooltip title="Choose the Classification to create new labels with.">
              <Select
                native={true}
                fullWidth={true}
                onChange={(e) => this.setState({ classification: e.target.value })}
              >
                {classifications.size === 0 && <option>No classifications found in system.</option>}
                {classifications.map(classificationOption)}
              </Select>
            </Tooltip>
            {isVideo && <video ref={this.videoRef} src={audioUrl} style={{ maxWidth: "100%" }} />}

            {wavesurfer && (
              <div className="toolbar">
                <Tooltip title={isPlaying ? "Pause" : "Play"}>
                  <Button
                    mini={true}
                    color={isPlaying ? "secondary" : "primary"}
                    onClick={this.togglePlayPauseAudio}
                  >
                    {isPlaying ? <Pause /> : <PlayArrowRounded />}
                  </Button>
                </Tooltip>
                <Tooltip title="Decrease Playback Rate">
                  <Button mini={true} color="primary" onClick={this.decreasePlaybackRate}>
                    <FastRewind />
                  </Button>
                </Tooltip>
                <Tooltip title="Increase Playback Rate">
                  <Button mini={true} color="primary" onClick={this.increasePlaybackRate}>
                    <FastForward />
                  </Button>
                </Tooltip>
                <NotificationContext.Consumer>
                  {({ notify }) => {
                    const notifiedHandler = async () =>
                      this.handleSaveLabels().then((dataBlobs) => {
                        notify(`${dataBlobs.length} successfully saved to database.`)
                      })
                    return (
                      <Tooltip
                        title={`(Re)Save labels for ${
                          this.props.filepath
                        }. Useful if data somehow changed or got corrupted.`}
                      >
                        <Button mini={true} onClick={notifiedHandler}>
                          <Save />
                        </Button>
                      </Tooltip>
                    )
                  }}
                </NotificationContext.Consumer>
                <NotificationContext.Consumer>
                  {({ notify }) => {
                    const notifiedHandler = async () =>
                      this.handleDownloadLabels().then(() =>
                        notify(`Exported labels for ${this.props.filepath} to '~/reverb-export'`),
                      )
                    return (
                      <Tooltip
                        title={`Export labels for ${this.props.filepath} to '~/reverb-export'`}
                      >
                        <Button mini={true} onClick={notifiedHandler}>
                          <CloudDownload />
                        </Button>
                      </Tooltip>
                    )
                  }}
                </NotificationContext.Consumer>
                <Tooltip title="Add Label">
                  <Button mini={true} color="primary" onClick={this.handleAddLabel}>
                    <AddComment />
                  </Button>
                </Tooltip>
                <Tooltip title="Zoom In">
                  <Button mini={true} color="primary" onClick={this.handleZoomIn}>
                    <ZoomIn />
                  </Button>
                </Tooltip>
                <Tooltip title="Zoom Out">
                  <Button mini={true} color="secondary" onClick={this.handleZoomOut}>
                    <ZoomOut />
                  </Button>
                </Tooltip>
                <Tooltip title="Toggle Spectrogram; Warning! CPU intensive. Not recommended for > 4 minute files. Window may appear to freeze while computing.">
                  <Button mini={true} color="secondary" onClick={this.toggleSpectrogram}>
                    <GraphicEq />
                  </Button>
                </Tooltip>
                <Button
                  style={{ display: "none" }}
                  mini={true}
                  key="test-data"
                  color="secondary"
                  onClick={this.spawnTestData}
                >
                  Spawn Test Data
                </Button>
              </div>
            )}

            {this.state.isLoading && <LinearProgress />}
            <div ref={this.wavesurferContainerRef} style={maxWidthRefStyles} />
            <div ref={this.timelineRef} style={maxWidthRefStyles} />
            <div ref={this.spectrogramRef} style={maxWidthRefStyles} />
          </Paper>
        </div>
        {wavesurfer && (
          <div style={{ flex: isVideo ? "1" : "2", overflow: "scroll" }}>
            <div style={{ flex: "1 1", height: "1px" }}>
              <LabelTable
                compact={isVideo}
                labels={this.state.labels}
                currentlyPlayingLabelIds={this.state.currentlyPlayingLabelIds}
                playLabel={this.handlePlayLabel}
                deleteLabel={this.handleDeleteLabel}
                updateLabelClassification={this.handleUpdateLabelClassification}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Helpers
  ////////////////////////////////////////////////////////////////////////////////
  private togglePlayPauseAudio = async () => {
    this.wavesurfer().then((ws) => {
      this.state.isPlaying
        ? this.setState({ isPlaying: false }, () => ws.pause())
        : this.setState({ isPlaying: true }, () => ws.play())
    })
  }

  private increasePlaybackRate = async () => {
    return this.setPlaybackRate(this.state.playbackRate * 1.2)
  }

  private decreasePlaybackRate = async () => {
    return this.setPlaybackRate(this.state.playbackRate * 0.8)
  }

  /**
   * Clears Wavesurfer of regions and re-adds them all in order of largest to smallest (smaller rendered on top of larger)
   */
  private syncRegionWithLabels = async () => {
    this.wavesurfer().then((ws) => {
      ws.clearRegions()
      // Detach "region-created" event so adding regions doesn't trigger label creation
      ws.un("region-created", this.handleWavesurferRegionCreate)

      // Sort the labels by size (largest first) before re-adding. Large always on bottom
      const { labels, wavesurferRegionIdToLabelIdMap } = this.state
      const regionLabelMap = labels
        .sort((a, b) => b.endTime - b.startTime - (a.endTime - a.startTime))
        .reduce((carry, { id: labelId, startTime, endTime, classification }) => {
          const region = ws.addRegion({
            start: startTime,
            end: endTime,
            color: stringToRGBA(classification.name),
          })
          return carry.set(region.id, labelId)
        }, wavesurferRegionIdToLabelIdMap.clear())
      this.setState({ wavesurferRegionIdToLabelIdMap: regionLabelMap })

      // Reattach "region-created"
      ws.on("region-created", this.handleWavesurferRegionCreate)
    })
  }

  private setPlaybackRate = async (playbackRate: number): Promise<number> => {
    // Update the video element (if it exists), wavesurfer, and state
    return this.wavesurfer().then((ws) => {
      this.videoElement()
        .then((el) => {
          el.playbackRate = playbackRate
        })
        .catch(() => null)
      ws.setPlaybackRate(playbackRate)
      this.setState({ playbackRate })
      return playbackRate
    })
  }

  private addLabel = async (label: {
    startTime: number
    endTime?: number
    classification: Classification | string
  }) => {
    const { audioFile_, audioBuffer_ } = this.state
    const classification_ =
      typeof label.classification === "string"
        ? Promise.resolve(this.getClassification(label.classification))
        : label.classification
    const [startTime, endTime] = [
      label.startTime,
      label.endTime || label.startTime + 1, // Default to an endTime of startTime+1
    ]
    const audioBuffer = await audioBuffer_
    const slicedSegment = await sliceAudioBuffer(audioBuffer, label.startTime, endTime)
    // DANGEROUS!! Using Node `Buffer` in front-end code so we can save the segment to DB. Will appear as a Uint8Array on client side when queried
    const arrayBuffer = await new Response(WavAudioEncoder.encode(slicedSegment)).arrayBuffer()
    const [audioFile, classification, sampleData] = await Promise.all([
      audioFile_,
      classification_,
      DataBlob.create({
        blob: Buffer.from(arrayBuffer),
      }).save(),
    ])
    const wavesurferRegion = {
      start: startTime,
      end: endTime,
      color: stringToRGBA(classification.name),
    }
    const region_ = this.wavesurfer().then((ws) => ws.addRegion(wavesurferRegion))
    const savedLabel = Label.create({
      startTime,
      endTime,
      audioFile,
      classification,
      sampleData,
    })
      .save()
      .catch((err) => {
        console.error(err)
        console.log(`Failed to save Label, removing corresponding region`)
        region_.then((region) => {
          region.remove()
          console.info(`Removed region ${region.id} from player`)
        })
        return Promise.reject(err)
      })

    return savedLabel
  }

  private getClassification = async (name: string) =>
    Classification.findOne({ name }).then((c) => c || Classification.create({ name }).save())

  private spawnTestData = async () => {
    const classifications_ = Range(0, 10)
      .map(() =>
        Math.random()
          .toString(36)
          .substring(2),
      )
      .map((labelText) => Classification.create({ name: labelText }).save())
    const classifications = await Promise.all(classifications_)
    const audioBuffer = await this.state.audioBuffer_
    const audioDuration = audioBuffer.duration - 1 // -1 because total length might be round up
    const randomTimes = Range(0, 1000).map(() => Math.random() * audioDuration)
    const labels = await Promise.all(
      randomTimes.map(async (startTime) => {
        const classification = classifications[Math.floor(Math.random() * classifications.length)]
        return this.addLabel({ startTime, classification })
      }),
    )

    return labels
  }

  private handleLabelChange: React.ChangeEventHandler<HTMLInputElement> = async ({ target }) =>
    this.setState({ classification: target.value })

  private handleSaveLabels = async () => {
    return this.resaveAllLabelSamples()
  }

  private handleDownloadLabels = async () => {
    return this.state.audioFile_
      .then(({ id }) => AudioFile.exportLabels(id))
      .then(() => console.log("Export Complete"))
  }

  private handleAddLabel = async () => {
    const { classification } = this.state
    console.log(classification)
    return this.wavesurfer().then((ws) =>
      this.addLabel({ startTime: ws.getCurrentTime(), classification }),
    )
  }

  private handleZoomIn = async () => {
    const { zoom } = this.state
    const zoomedIn = zoom + 20
    return this.wavesurfer().then((ws) => {
      ws.zoom(zoomedIn)
      this.setState({ zoom: zoomedIn })
    })
  }

  private handleZoomOut = async () => {
    const { zoom } = this.state
    const zoomedOut = zoom >= 20 ? zoom - 20 : 0
    return this.wavesurfer().then((ws) => {
      ws.zoom(zoomedOut)
      this.setState({ zoom: zoomedOut })
    })
  }

  private toggleSpectrogram = async () => {
    const ws = await this.wavesurfer()
    if (Object.keys(ws.initialisedPluginList).includes("spectrogram")) {
      this.destroySpectrogram(ws)
    } else {
      this.generateSpectrogram(ws)
    }
  }

  /**
   * Spectrogram plugin for WaveSurfer is sorta buggy.
   * Destroy if already already there; then created
   * @see https://wavesurfer-js.org/v2/changes.html
   */
  private generateSpectrogram = async (ws: WaveSurferInstance) => {
    if (Object.keys(ws.initialisedPluginList).includes("spectrogram")) {
      this.destroySpectrogram(ws)
    }
    ws.addPlugin(
      SpectrogramPlugin.create({
        container: this.spectrogramRef.current as HTMLDivElement,
        labels: true,
      }),
    )
    ws.initPlugin("spectrogram")
  }

  private destroySpectrogram = async (ws: WaveSurferInstance) => {
    ws.destroyPlugin("spectrogram")
  }

  private handleWavesurferRegionCreate = async (region: Region) => {
    console.info(`Creating label for region ${region.id}`)
    // Make region correct color
    region.color = stringToRGBA(this.state.classification)

    // Create/Save Label
    const { audioFile_, audioBuffer_, classification: label } = this.state

    const audioBuffer = await audioBuffer_
    const slicedBuffer = await sliceAudioBuffer(audioBuffer, region.start, region.end)
    const arrayBuffer = await new Response(WavAudioEncoder.encode(slicedBuffer)).arrayBuffer()
    const [audioFile, classification, sampleData] = await Promise.all([
      audioFile_,
      this.getClassification(label),
      DataBlob.create({
        blob: Buffer.from(arrayBuffer),
      }).save(),
    ])

    return Label.create({
      startTime: region.start,
      endTime: region.end,
      audioFile,
      classification,
      sampleData,
    })
      .save()
      .then((l) => {
        const { labels, wavesurferRegionIdToLabelIdMap } = this.state
        // Find index to insert into to maintain sorted list; assumes list is already sorted
        const targetIndex = labels.findIndex((neighbor) => neighbor.startTime > l.startTime)
        this.setState({
          labels: labels.insert(targetIndex >= 0 ? targetIndex : labels.size, l),
          wavesurferRegionIdToLabelIdMap: wavesurferRegionIdToLabelIdMap.set(region.id, l.id),
        })
        return l
      })
      .catch((err) => {
        region.remove()
        console.error(err)
        return Promise.reject(new Error(err))
      })
  }

  private wavesurfer = async () => {
    const { wavesurfer: ws } = this.state
    return ws || Promise.reject(new Error("Wavesurfer not initialized"))
  }

  private handlePlayLabel = async ({ id: targetLabelId }: Label) => {
    // Debug: Play the actual stored audio instead
    // Label.playAudio(targetLabelId)

    const wavesurfer = await this.wavesurfer()
    this.state.wavesurferRegionIdToLabelIdMap
      .filter((labelId) => labelId === targetLabelId)
      .map((_, regionId) => wavesurfer.regions.list[regionId])
      .take(1)
      .forEach((region) => {
        region.play()
      })
  }

  private playLabelSampleData = async (targetLabelId: number) => {
    this.state.wavesurferRegionIdToLabelIdMap
      .filter((labelId) => labelId === targetLabelId)
      .forEach((labelId) => {
        Label.getRepository()
          .find({ relations: ["sampleData"], where: { id: labelId }, take: 1 })
          .then((labelsWithSample) => {
            labelsWithSample.forEach((label) => {
              new Response(label.sampleData.blob).blob().then((blob) => {
                const url = URL.createObjectURL(blob)
                const audio = new Audio(url)
                audio.play()
              })
            })
          })
      })
  }

  private resaveAllLabelSamples = async () => {
    const labelIds = this.state.labels.map((label) => label.id).toArray()
    return Promise.all([
      this.state.audioBuffer_,
      Label.getRepository().findByIds(labelIds, { relations: ["sampleData"] }),
    ]).then(([audioBuffer, labelsWithSample]) => {
      return Promise.all(
        labelsWithSample.map((labelWithSample) => {
          const { sampleData, startTime, endTime } = labelWithSample
          return sliceAudioBuffer(audioBuffer, startTime, endTime).then((slicedSegment) => {
            return new Response(WavAudioEncoder.encode(slicedSegment))
              .arrayBuffer()
              .then((arrBuffer) => {
                sampleData.blob = Buffer.from(arrBuffer)
                return sampleData.save().then((updated) => {
                  console.info(`Updated DataBlob ${updated.id}`)
                  return updated
                })
              })
          })
        }),
      )
    })
  }

  private handleDeleteLabel = async (label: Label) => {
    const { id: targetLabelId } = label
    const wavesurfer = await this.wavesurfer()
    this.state.wavesurferRegionIdToLabelIdMap
      .filter((labelId) => labelId === targetLabelId)
      .map((_, regionId) => wavesurfer.regions.list[regionId])
      .take(1)
      .forEach((region) => {
        // Delete from state
        const { labels } = this.state
        this.setState({
          labels: labels.delete(labels.findIndex(({ id: labelId }) => labelId === targetLabelId)),
        })
        // Remove from DB
        Label.getRepository()
          .find({ relations: ["sampleData"], where: { id: label.id }, take: 1 })
          .then((labelsWithSample) => {
            labelsWithSample.forEach((labelWithSample) => {
              const { sampleData, id: labelId } = labelWithSample
              labelWithSample.remove().then((_) => {
                console.log(`Label ${labelId} removed.`)
                const { id: sampleId } = sampleData
                sampleData.remove().then((__) => {
                  console.log(`DataBlob ${sampleId} removed.`)
                })
              })
            })
          })
        // Remove from wavesurfer
        region.remove()
      })
  }

  private handleUpdateLabelClassification = async (
    label: Label,
    classification: Classification,
  ) => {
    this.wavesurfer().then((wavesurfer) => {
      const { labels, wavesurferRegionIdToLabelIdMap } = this.state
      label.classification = classification
      label.save().then((updatedLabel) => {
        const updateIndex = labels.findIndex(({ id: labelId }) => labelId === label.id)
        wavesurferRegionIdToLabelIdMap
          .filter((labelId, _) => labelId === label.id)
          .map((_, regionId) => wavesurfer.regions.list[regionId])
          .take(1)
          .forEach((region) => {
            // BUG: wavesurfer doesn't update the color until the a redraw is triggered by interacting with waveform
            region.color = stringToRGBA(updatedLabel.classification.name)
          })
        this.setState({ labels: this.state.labels.set(updateIndex, updatedLabel) })
      })
    })
  }

  private videoElement = async () => {
    return this.videoRef.current
      ? this.videoRef.current
      : Promise.reject(new Error(`videoRef not found`))
  }

  private isVideoFile = (filename: string) => {
    return (
      ["mp4", "ogv", "webm"].findIndex((extension) => {
        return !!filename.match(new RegExp(`.${extension}$`, "i"))
      }) >= 0
    )
  }

  /**
   * Mount the custom events to Wavesurfer
   */
  private mountWavesurferEvents = (wavesurfer: WaveSurferInstance & WaveSurferRegions) => {
    // Only after ready we should bind region handlers to avoid duplicating already create labels
    wavesurfer.on("ready", () => {
      console.info("Wavesurfer ready")
      this.setState({ isLoading: false })
      wavesurfer.on("region-created", this.handleWavesurferRegionCreate)
      wavesurfer.on("region-in", async ({ id: regionId }) => {
        const { wavesurferRegionIdToLabelIdMap, currentlyPlayingLabelIds } = this.state
        wavesurferRegionIdToLabelIdMap
          .filter((_, possibleRegionId) => possibleRegionId === regionId)
          .take(1)
          .forEach((labelId, _) => {
            this.setState({
              currentlyPlayingLabelIds: currentlyPlayingLabelIds.add(labelId),
            })
          })
      })
      wavesurfer.on("region-out", async ({ id: regionId }) => {
        const { wavesurferRegionIdToLabelIdMap, currentlyPlayingLabelIds } = this.state
        wavesurferRegionIdToLabelIdMap
          .filter((_, possibleRegionId) => possibleRegionId === regionId)
          .take(1)
          .forEach((labelId, _) => {
            this.setState({
              currentlyPlayingLabelIds: currentlyPlayingLabelIds.delete(labelId),
            })
          })
      })
      wavesurfer.on("region-update-end", async ({ id: targetRegionId, start, end }) => {
        const { wavesurferRegionIdToLabelIdMap, labels, audioBuffer_ } = this.state
        console.info(`Updating region position ${targetRegionId}`)
        wavesurferRegionIdToLabelIdMap
          .filter((_, possibleRegionId) => possibleRegionId === targetRegionId)
          .map((labelId) => labels.findIndex(({ id }) => id === labelId))
          .filter((labelIndex) => labelIndex >= 0)
          .map<[number, Label]>((labelIndex) => [labelIndex, labels.get(labelIndex) as Label])
          .take(1)
          .forEach(([labelIndex, label]) => {
            label.startTime = start
            label.endTime = end
            // Update label
            label.save().then((updatedLabel) => {
              this.setState(
                {
                  labels: labels
                    .set(labelIndex, updatedLabel)
                    .sort((a, b) => a.startTime - b.startTime),
                },
                this.syncRegionWithLabels,
              )
            })
            // Update WAV sample
            Promise.all([
              audioBuffer_,
              Label.getRepository().find({
                relations: ["sampleData"],
                where: { id: label.id },
                take: 1,
              }),
            ]).then(([audioBuffer, labelsWithSample]) => {
              labelsWithSample.forEach((labelWithSample) => {
                const { sampleData } = labelWithSample
                sliceAudioBuffer(audioBuffer, label.startTime, label.endTime)
                  .then((slicedSegment) => {
                    return new Response(WavAudioEncoder.encode(slicedSegment)).arrayBuffer()
                  })
                  .then((arrayBuffer) => {
                    sampleData.blob = Buffer.from(arrayBuffer)
                    sampleData.save().then((updated) => {
                      console.info(`Updated DataBlob ${updated.id}`)
                    })
                  })
              })
            })
          })
      })
      wavesurfer.on("region-dblclick", (region) => {
        // BUG: calling region.play() continues to play after exiting the region
        region.play()
      })
      wavesurfer.on("region-play", (region) => {
        this.videoElement()
          .then((el) => {
            el.currentTime = region.start
          })
          .catch(console.info)
      })
      wavesurfer.on("play", () => {
        this.setState({ isPlaying: true })
        Promise.all([this.wavesurfer(), this.videoElement()])
          .then(([ws, video]) => {
            video.currentTime = ws.getCurrentTime()
            video.play()
          })
          .catch(console.info)
      })
      wavesurfer.on("pause", () => {
        this.setState({ isPlaying: false })
        this.videoElement()
          .then((el) => {
            el.pause()
          })
          .catch(console.info)
      })
      wavesurfer.on("seek", async (progress: number) => {
        this.videoElement()
          .then((el) => {
            const jumpTo = progress * el.duration
            el.currentTime = jumpTo
          })
          .catch(console.info)
      })
    })

    return wavesurfer
  }
}
