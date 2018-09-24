import { Button, Paper, TextField, Tooltip } from "@material-ui/core";
import {
  CloudDownload,
  GraphicEq,
  LabelImportant,
  Pause,
  PlayArrowRounded,
  ZoomIn,
  ZoomOut,
} from "@material-ui/icons";
import { Buffer } from "buffer";
import { basename, dirname } from "path";
import React from "react";
import WaveSurfer, { WaveSurferInstance } from "wavesurfer.js";
import MinimapPlugin from "wavesurfer.js/dist/plugin/wavesurfer.minimap.js";
import RegionsPlugin, {
  Region,
  WaveSurferRegions,
} from "wavesurfer.js/dist/plugin/wavesurfer.regions.js";
import SpectrogramPlugin from "wavesurfer.js/dist/plugin/wavesurfer.spectrogram.js";
import TimelinePlugin from "wavesurfer.js/dist/plugin/wavesurfer.timeline.js";
import { AudioFile } from "../entities/AudioFile";
import { Classification } from "../entities/Classification";
import { DataBlob } from "../entities/DataBlob";
import { Label } from "../entities/Label";
import { sliceAudioBuffer } from "../lib/audio";
import { stringToRGBA } from "../lib/colour";
import { getDBConnection } from "../lib/database";
import { WavEncoder } from "../lib/WavEncoder";
import { LabelTable } from "./LabelTable";

export interface IAudioPlayerProps {
  audioBlob: Blob;
  filepath: string; // actual location on filesystem
}

interface IAudioPlayerState {
  audioUrl: string;
  audioBuffer_: Promise<AudioBuffer>;
  audioFile_: Promise<AudioFile>;
  classification: string;
  currentlyPlayingLabelIds: number[];
  labels: Label[];
  wavesurferRegionIdToLabelIdMap: { [wavesurferRegionId: string]: number };
  wavesurfer?: WaveSurferInstance & WaveSurferRegions;
  zoom: number;
}

export class AudioPlayer extends React.PureComponent<IAudioPlayerProps, IAudioPlayerState> {
  private static async getRecord(filepath: string): Promise<AudioFile> {
    const props = {
      dirname: dirname(filepath),
      basename: basename(filepath),
    };
    return getDBConnection().then(async (_) => {
      const record = await AudioFile.findOne(props);
      return record ? record : AudioFile.create(props).save();
    });
  }

  public state: IAudioPlayerState = {
    audioBuffer_: new Response(this.props.audioBlob)
      .arrayBuffer()
      .then((buffer) => new OfflineAudioContext(2, 16000 * 40, 16000).decodeAudioData(buffer)), // two channels at 16000hz
    audioUrl: URL.createObjectURL(this.props.audioBlob),
    audioFile_: AudioPlayer.getRecord(this.props.filepath),
    classification: "default",
    currentlyPlayingLabelIds: [],
    labels: [],
    wavesurferRegionIdToLabelIdMap: {},
    zoom: 50,
  };

  /**
   * DOM refs to keep track of elements for WaveSurfer to mount
   */
  private wavesurferContainerRef = React.createRef<HTMLDivElement>();
  private timelineRef = React.createRef<HTMLDivElement>();
  private spectrogramRef = React.createRef<HTMLDivElement>();

  /**
   * On initial mount, initialize PeaksJS into DOM
   */
  public async componentDidMount() {
    const { audioFile_, zoom: minPxPerSec, audioUrl } = this.state;
    const audioFile = await audioFile_;
    const labels = await audioFile
      .getLabels()
      .then((unsorted) => unsorted.sort((a, b) => a.startTime - b.startTime));
    const regions = labels.map(
      ({ id, startTime: start, endTime: end, classification: { name: labelName } }) => ({
        id,
        start,
        end,
        color: stringToRGBA(labelName),
      }),
    );
    const wavesurferRegionIdToLabelIdMap = regions.reduce((carry, region) => {
      return {
        ...carry,
        [region.id]: region.id,
      };
    }, {});
    const wavesurfer = WaveSurfer.create({
      container: this.wavesurferContainerRef.current as HTMLDivElement,
      waveColor: "violet",
      progressColor: "purple",
      scrollParent: true,
      hideScrollbar: false,
      minPxPerSec,
      plugins: [
        TimelinePlugin.create({ container: this.timelineRef.current as HTMLDivElement }),
        MinimapPlugin.create(),
        RegionsPlugin.create({ dragSelection: true, regions }),
      ],
    }) as WaveSurferInstance & WaveSurferRegions;

    // Only after ready we should bind region handlers to avoid duplicating already create labels
    wavesurfer.on("ready", () => {
      console.info("Wavesurfer ready");
      wavesurfer.on("region-created", this.handleWavesurferRegionCreate);
      wavesurfer.on("region-in", async ({ id: regionId }: Region) => {
        const correspondingLabelId = this.state.wavesurferRegionIdToLabelIdMap[regionId];
        this.setState({
          currentlyPlayingLabelIds: this.state.currentlyPlayingLabelIds.concat(
            correspondingLabelId,
          ),
        });
      });
      wavesurfer.on("region-out", async ({ id: regionId }: Region) => {
        const correspondingLabelId = this.state.wavesurferRegionIdToLabelIdMap[regionId];
        this.setState({
          currentlyPlayingLabelIds: this.state.currentlyPlayingLabelIds.filter(
            (labelId) => labelId !== correspondingLabelId,
          ),
        });
      });
    });
    wavesurfer.load(audioUrl);
    this.setState({
      wavesurfer,
      labels,
      wavesurferRegionIdToLabelIdMap,
    });
  }

  /**
   * Ensure Peaks is destroyed before unmounting (memory leaks).
   */
  public async componentWillUnmount() {
    (({ wavesurfer: w } = this.state) => w && w.destroy())();
  }

  public render() {
    const { wavesurfer } = this.state;
    const maxWidthRefStyles = { width: "100%", minWidth: "20vw" };
    return (
      // tslint:disable-next-line:jsx-no-lambda
      <div
        className="AudioPlayer"
        style={{ display: "flex", flexDirection: "column", height: "100%" }}
        onKeyPress={() => console.log("KEY PRESSED")}
      >
        <div
          style={{
            paddingBottom: "5px",
            marginBottom: "5px",
            // flex: 1
          }}
        >
          <Paper>
            {wavesurfer && (
              <div className="toolbar">
                <Tooltip title="Play">
                  <Button mini={true} color="primary" onClick={this.playAudio}>
                    <PlayArrowRounded />
                  </Button>
                </Tooltip>
                <Tooltip title="Pause">
                  <Button mini={true} color="secondary" onClick={this.pauseAudio}>
                    <Pause />
                  </Button>
                </Tooltip>
                <Tooltip title={`Export labels for ${this.props.filepath} to '~/reverb-export'`}>
                  <Button mini={true} onClick={this.handleDownloadLabels}>
                    <CloudDownload />
                  </Button>
                </Tooltip>
                {/* <TextField
            required={true}
            id="label"
            label="Label"
            margin="normal"
            onChange={this.handleLabelChange}
            /> */}
                <Tooltip title="Add Label">
                  <Button mini={true} color="primary" onClick={this.handleAddLabel}>
                    <LabelImportant />
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
                <Tooltip title="(Re)generate Spectrogram; Warning! CPU intensive. Not recommended for > 4 minute files. Window may appear to freeze while computing.">
                  <Button mini={true} color="secondary" onClick={this.generateSpectrogram}>
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

            <div ref={this.wavesurferContainerRef} style={maxWidthRefStyles} />
            <div ref={this.timelineRef} style={maxWidthRefStyles} />
            <div ref={this.spectrogramRef} style={maxWidthRefStyles} />
          </Paper>
        </div>
        {wavesurfer && (
          <div style={{ flex: 2, height: 0, overflow: "scroll" }}>
            <LabelTable
              labels={this.state.labels}
              currentlyPlayingLabelIds={this.state.currentlyPlayingLabelIds}
              playLabel={({ id }: Label) => {
                const correspondingRegionLabelIdPairs = Object.entries(
                  this.state.wavesurferRegionIdToLabelIdMap,
                ).filter(([_, labelId]) => id === labelId);
                correspondingRegionLabelIdPairs.forEach(([regionId, _]) =>
                  wavesurfer.regions.list[regionId].play(),
                );
              }}
              deleteLabel={({ id }: Label) => {
                const correspondingRegionLabelIdPairs = Object.entries(
                  this.state.wavesurferRegionIdToLabelIdMap,
                ).filter(([_, labelId]) => id === labelId);
                correspondingRegionLabelIdPairs.forEach(([regionId, _]) =>
                  wavesurfer.regions.list[regionId].remove(),
                );
              }}
            />
          </div>
        )}
      </div>
    );
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Helpers
  ////////////////////////////////////////////////////////////////////////////////
  private playAudio = async () => {
    const { wavesurfer } = this.state;
    return wavesurfer
      ? wavesurfer.play()
      : Promise.reject(
          new Error(`Failed to call play() on wavesurfer instance; instance: ${wavesurfer}`),
        );
  };

  private pauseAudio = async () => {
    const { wavesurfer } = this.state;
    return wavesurfer
      ? wavesurfer.pause()
      : Promise.reject(
          new Error(`Failed to call pause() on wavesurfer instance; instance: ${wavesurfer}`),
        );
  };

  private addLabel = async (label: {
    startTime: number;
    endTime?: number;
    classification: Classification | string;
  }) => {
    const { wavesurfer, audioFile_, audioBuffer_ } = this.state;
    const classification_ =
      typeof label.classification === "string"
        ? Promise.resolve(this.getClassification(label.classification))
        : label.classification;
    const [startTime, endTime] = [
      label.startTime,
      label.endTime || label.startTime + 1, // Default to an endTime of startTime+1
    ];
    const audioBuffer = await audioBuffer_;
    const slicedSegment = await sliceAudioBuffer(audioBuffer, label.startTime, endTime);
    // DANGEROUS!! Using Node `Buffer` in front-end code so we can save the segment to DB. Will appear as a Uint8Array on client side when queried
    const [audioFile, classification, sampleData] = await Promise.all([
      audioFile_,
      classification_,
      DataBlob.create({
        blob: Buffer.from(WavEncoder.encode(slicedSegment)),
      }).save(),
    ]);
    const wavesurferRegion = {
      start: startTime,
      end: endTime,
      color: stringToRGBA(classification.name),
    };
    const region = await this.wavesurfer().then((ws) => ws.addRegion(wavesurferRegion));
    const savedLabel = Label.create({
      startTime,
      endTime,
      audioFile,
      classification,
      sampleData,
    })
      .save()
      .catch((err) => {
        console.error(err);
        console.log(`Failed to save Label, removing corresponding region`);
        region.remove();
        console.info(`Removed region ${region.id} from player`);
        return Promise.reject(err);
      });

    return savedLabel;
  };

  private getClassification = async (name: string) =>
    Classification.findOne({ name }).then((c) => c || Classification.create({ name }).save());

  private spawnTestData = async () => {
    const classifications = await Promise.all(
      [...Array(10)]
        .map(() =>
          Math.random()
            .toString(36)
            .substring(2),
        )
        .map((labelText) => Classification.create({ name: labelText }).save()),
    );
    const audioBuffer = await this.state.audioBuffer_;
    const audioDuration = audioBuffer.duration - 1; // -1 because total length might be round up
    const randomTimes = [...Array(1000)].map(() => Math.random() * audioDuration);
    const labels = await Promise.all(
      randomTimes.map(async (startTime) => {
        const classification = classifications[Math.floor(Math.random() * classifications.length)];
        return this.addLabel({ startTime, classification });
      }),
    );

    return labels;
  };

  private handleLabelChange: React.ChangeEventHandler<HTMLInputElement> = async ({ target }) =>
    this.setState({ classification: target.value });

  private handleDownloadLabels = async () =>
    (({ audioFile_ } = this.state) =>
      audioFile_
        .then(({ id }) => AudioFile.exportLabels(id))
        .then(() => console.log("Export Complete")))();

  private handleAddLabel = async () => {
    const { classification } = this.state;
    return this.wavesurfer().then((ws) =>
      this.addLabel({ startTime: ws.getCurrentTime(), classification }),
    );
  };

  private handleZoomIn = async () => {
    const { zoom } = this.state;
    const zoomedIn = zoom + 20;
    return this.wavesurfer().then((ws) => {
      ws.zoom(zoomedIn);
      this.setState({ zoom: zoomedIn });
    });
  };

  private handleZoomOut = async () => {
    const { zoom } = this.state;
    const zoomedOut = zoom >= 20 ? zoom - 20 : 0;
    return this.wavesurfer().then((ws) => {
      ws.zoom(zoomedOut);
      this.setState({ zoom: zoomedOut });
    });
  };

  /**
   * Spectrogram plugin for WaveSurfer is sorta buggy.
   * Destroy if already already there; then created
   * @see https://wavesurfer-js.org/v2/changes.html
   */
  private generateSpectrogram = async () => {
    this.wavesurfer().then((ws) => {
      if (Object.keys(ws.initialisedPluginList).indexOf("spectrogram") > -1) {
        ws.destroyPlugin("spectrogram");
      }
      ws.addPlugin(
        SpectrogramPlugin.create({
          container: this.spectrogramRef.current as HTMLDivElement,
          labels: true,
        }),
      );
      ws.initPlugin("spectrogram");
    });
  };

  private handleWavesurferRegionCreate = async (region: Region) => {
    console.info("Creating label for", region.id, region);
    // Make region correct color
    region.color = stringToRGBA(this.state.classification);

    // Create/Save Label
    const { audioFile_, audioBuffer_, classification: label } = this.state;

    const audioBuffer = await audioBuffer_;
    const slicedBuffer = await sliceAudioBuffer(audioBuffer, region.start, region.end);
    const [audioFile, classification, sampleData] = await Promise.all([
      audioFile_,
      this.getClassification(label),
      DataBlob.create({
        blob: Buffer.from(WavEncoder.encode(slicedBuffer)),
      }).save(),
    ]);

    return Label.create({
      startTime: region.start,
      endTime: region.end,
      audioFile,
      classification,
      sampleData,
    })
      .save()
      .then((l) => {
        const { labels, wavesurferRegionIdToLabelIdMap } = this.state;
        this.setState({
          labels: [...labels, l],
          wavesurferRegionIdToLabelIdMap: {
            ...wavesurferRegionIdToLabelIdMap,
            [region.id]: l.id,
          },
        });
        return l;
      })
      .catch((err) => {
        region.remove();
        console.error(err);
        return Promise.reject(new Error(err));
      });
  };

  private wavesurfer = async () => {
    const { wavesurfer: ws } = this.state;
    return ws || Promise.reject("Wavesurfer not initialized");
  };
}
