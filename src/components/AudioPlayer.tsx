import { Button, TextField, Tooltip } from "@material-ui/core";
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
import { AudioFile } from "../entities/AudioFile";
import { Classification } from "../entities/Classification";
import { DataBlob } from "../entities/DataBlob";
import { Label } from "../entities/Label";
import { Audio } from "../lib/Audio";
import { Database } from "../lib/Database";
import { WavEncoder } from "../lib/WavEncoder";

// WaveSurfer
import WaveSurfer, { WaveSurferInstance } from "wavesurfer.js";
// tslint:disable-next-line:no-submodule-imports
import MinimapPlugin from "wavesurfer.js/dist/plugin/wavesurfer.minimap.js";
// tslint:disable-next-line:no-submodule-imports
import RegionsPlugin, { WaveSurferRegions } from "wavesurfer.js/dist/plugin/wavesurfer.regions.js";
// tslint:disable-next-line:no-submodule-imports
import SpectrogramPlugin from "wavesurfer.js/dist/plugin/wavesurfer.spectrogram.js";
// tslint:disable-next-line:no-submodule-imports
import TimelinePlugin from "wavesurfer.js/dist/plugin/wavesurfer.timeline.js";

export interface IAudioPlayerProps {
  audioBlob: Blob;
  filepath: string; // actual location on filesystem
}

interface IAudioPlayerState {
  audioUrl: string;
  audioBuffer_: Promise<AudioBuffer>;
  audioContext: AudioContext;
  audioFile_: Promise<AudioFile>;
  classification: string;
  wavesurfer?: WaveSurferInstance & WaveSurferRegions;
}

export class AudioPlayer extends React.PureComponent<IAudioPlayerProps, IAudioPlayerState> {
  private static async getRecord(filepath: string): Promise<AudioFile> {
    const props = {
      dirname: dirname(filepath),
      basename: basename(filepath),
    };
    return Database.getConnection().then(async (_) => {
      const record = await AudioFile.findOne(props);
      return record ? record : AudioFile.create(props).save();
    });
  }

  public state: IAudioPlayerState = {
    audioBuffer_: new Response(this.props.audioBlob)
      .arrayBuffer()
      .then((buffer) => new OfflineAudioContext(2, 16000 * 40, 16000).decodeAudioData(buffer)), // two channels at 16000hz
    audioContext: new AudioContext(),
    audioUrl: URL.createObjectURL(this.props.audioBlob),
    audioFile_: AudioPlayer.getRecord(this.props.filepath),
    classification: "default",
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
    const randomColor = (gradient = 0.5) =>
      `rgba(${Math.floor(Math.random() * 256)},${Math.floor(Math.random() * 256)},${Math.floor(
        Math.random() * 256,
      )}, ${gradient})`;
    const { audioFile_ } = this.state;
    const audioFile = await audioFile_;
    const labels = await audioFile.getLabels();
    const regions = labels.map(({ startTime: start, endTime: end }) => ({
      start,
      end,
      color: randomColor(),
    }));
    const wavesurfer = WaveSurfer.create({
      container: this.wavesurferContainerRef.current as HTMLDivElement,
      waveColor: "violet",
      progressColor: "purple",
      scrollParent: true,
      hideScrollbar: false,
      minPxPerSec: 50,
      plugins: [
        TimelinePlugin.create({ container: this.timelineRef.current as HTMLDivElement }),
        MinimapPlugin.create(),
        RegionsPlugin.create({ dragSelection: true, regions }),
      ],
    }) as WaveSurferInstance & WaveSurferRegions;
    (({ audioUrl } = this.state, w = wavesurfer) => w.load(audioUrl))();
    this.setState({ wavesurfer });
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
      <div className="AudioPlayer" onKeyPress={() => console.log("KEY PRESSED")}>
        {wavesurfer && (
          <div className="toolbar">
            <Tooltip title="Play">
              <Button mini={true} key="play-button" color="primary" onClick={this.playAudio}>
                <PlayArrowRounded />
              </Button>
            </Tooltip>
            <Tooltip title="Pause">
              <Button mini={true} key="pause-button" color="secondary" onClick={this.pauseAudio}>
                <Pause />
              </Button>
            </Tooltip>
            <Tooltip title="Download Labels to `~/reverb-export`">
              <Button mini={true} key="download-labels" onClick={this.handleDownloadLabels}>
                <CloudDownload />
              </Button>
            </Tooltip>
            <TextField
              required={true}
              id="label"
              label="Label"
              margin="normal"
              onChange={this.handleLabelChange}
            />
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
                <ZoomIn />
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
    const { wavesurfer, audioFile_, audioBuffer_, audioContext } = this.state;
    const classification_ =
      typeof label.classification === "string"
        ? Promise.resolve(this.getClassification(label.classification))
        : label.classification;
    const [startTime, endTime] = [
      label.startTime,
      label.endTime || label.startTime + 1, // Default to an endTime of startTime+1
    ];
    const peaksSegmentId = Math.random()
      .toString(36)
      .substring(2);
    const audioBuffer = await audioBuffer_;
    const slicedSegment = await Audio.sliceAudioBuffer(audioBuffer, label.startTime, endTime);
    // DANGEROUS!! Using Node `Buffer` in front-end code so we can save the segment to DB. Will appear as a Uint8Array on client side when queried
    const [audioFile, classification, sampleData] = await Promise.all([
      audioFile_,
      classification_,
      DataBlob.create({
        blob: Buffer.from(WavEncoder.encode(slicedSegment)),
      }).save(),
    ]);
    const wavesurferRegion = { start: startTime, end: endTime };
    ((w = wavesurfer) => w && w.addRegion(wavesurferRegion))();
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
        const region =
          wavesurfer &&
          wavesurfer.regions.find(({ start, end }) => start === startTime && end === endTime);
        if (region) {
          region.remove();
        }
        console.info(`Removing segment ${peaksSegmentId} from player`);
        return Promise.reject(err);
      });

    return savedLabel;
  };

  private addLabelToPeaks = async (...labels: Label[]) => {
    const { wavesurfer } = this.state;
    const regions = labels.map(({ startTime: start, endTime: end }) => ({
      start,
      end,
    }));
    return wavesurfer
      ? regions.map(wavesurfer.addRegion) || regions
      : Promise.reject(new Error(`Failed to add segments to Peaks instance.`));
  };

  private getClassification = async (name: string) => {
    const c = await Classification.findOne({ name });
    return c || Classification.create({ name }).save();
  };

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

  private handleAddLabel = async () =>
    (({ wavesurfer: surfer, classification } = this.state) =>
      !surfer
        ? Promise.reject(new Error("Wavesurfer not initiated"))
        : this.addLabel({ startTime: surfer.getCurrentTime(), classification }))();

  private handleZoomIn = async () => (({ wavesurfer: ws } = this.state) => ws && ws.zoom(100))();
  private handleZoomOut = async () => (({ wavesurfer: ws } = this.state) => ws && ws.zoom(0))();

  /**
   * @see https://wavesurfer-js.org/v2/changes.html
   */
  private generateSpectrogram = async () =>
    (({ wavesurfer: surfer } = this.state) =>
      !surfer
        ? Promise.reject(new Error("Wavesurfer not initiated"))
        : (() => {
            Object.keys(surfer.initialisedPluginList)
              .filter((plugin) => plugin === "spectrogram")
              .forEach(surfer.destroyPlugin);
            surfer
              .addPlugin(
                SpectrogramPlugin.create({
                  container: this.spectrogramRef.current as HTMLDivElement,
                  labels: true,
                }),
              )
              .initPlugin("spectrogram");
          })())();
}
