import { Button } from "@material-ui/core";
import { CloudDownload, LabelImportant, Pause, PlayArrowRounded } from "@material-ui/icons";
import { Buffer } from "buffer";
import { writeFile } from "fs";
import { basename, dirname } from "path";
import PeaksJS, { PeaksInstance } from "peaks.js";
import React from "react";
import { promisify } from "util";
import { Audio } from "../Audio";
import { Database } from "../Database";
import { AudioFile } from "../entities/AudioFile";
import { Classification } from "../entities/Classification";
import { DataBlob } from "../entities/DataBlob";
import { Label } from "../entities/Label";
import { WavEncoder } from "../WavEncoder";

interface IAudioPlayerProps {
  audioURL: string;
}

interface IAudioPlayerState {
  audioBlobP: Promise<Blob>; // store blob in memory
  audioBufferP: Promise<AudioBuffer>;
  audioContext: AudioContext;
  audioFileP: Promise<AudioFile>;
  classificationText: string;
  peaks: PeaksInstance | null;
}

export class AudioPlayer extends React.PureComponent<IAudioPlayerProps, IAudioPlayerState> {
  private static convertAudioToWav = async (fileUrl: string) => {
    // NOTE `.decodeAudioData()` mutates and empties the buffer it uses
    // Store file in memory as a Blob (which are immutable) and generate ArrayBuffer to operate on it immutably
    const audioBlob = await fetch(fileUrl).then((r) => r.blob());
    const [audioData, audioBuffer] = await Promise.all([
      new Response(audioBlob).arrayBuffer().then((b) => new Uint8Array(b)),
      new Response(audioBlob)
        .arrayBuffer()
        .then((buffer) => new OfflineAudioContext(2, 44100 * 40, 44100).decodeAudioData(buffer)),
    ]);

    const wavBuffer = WavEncoder.encode(audioBuffer);

    /**
     * Write out the file to disk
     * Dangerously uses Node APIs
     */
    (async (wavArrayBuffer: ArrayBuffer) => {
      const filename = basename(fileUrl) + ".wav";
      const fileWritten = await promisify(writeFile)(filename, new Uint8Array(wavBuffer));
      console.info(`Wrote out ${filename}`);
      return filename;
    })(wavBuffer);
  };

  /**
   * DOM refs to keep track of elements for Peaks to mount
   */
  private peaksContainerRef: React.RefObject<HTMLDivElement>;
  private audioElementRef: React.RefObject<HTMLAudioElement>;

  constructor(props: IAudioPlayerProps) {
    super(props);
    this.peaksContainerRef = React.createRef<HTMLDivElement>();
    this.audioElementRef = React.createRef<HTMLAudioElement>();
    const audioBlobP = fetch(props.audioURL).then((r) => r.blob());
    const audioBufferP = audioBlobP.then((blob) =>
      new Response(blob)
        .arrayBuffer()
        .then((buffer) => new OfflineAudioContext(2, 44100 * 40, 44100).decodeAudioData(buffer)),
    );
    const audioFileP = this.getRecord();
    this.state = {
      audioBlobP,
      audioBufferP,
      audioContext: new AudioContext(),
      audioFileP,
      classificationText: "Random Label",
      peaks: null,
    };
  }

  /**
   * On initial mount, initialize PeaksJS into DOM
   */
  public async componentDidMount() {
    const { audioFileP } = this.state;
    const [peaksDiv, audioTag] = [this.peaksContainerRef.current, this.audioElementRef.current];
    const audioFile = await audioFileP;
    const labels = await audioFile.getLabels();
    console.log(labels);
    const segments = await Promise.all(labels.map(this.labelToPeaksSegment));
    const peaks = await (peaksDiv && audioTag
      ? PeaksJS.init({
          container: this.peaksContainerRef.current as HTMLDivElement,
          mediaElement: this.audioElementRef.current as HTMLAudioElement,
          audioContext: this.state.audioContext,
          segments,
        })
      : Promise.reject(
          new Error("Failed to initialize Peaks; Container or AudioElement refs are set to null."),
        ));
    this.setState({ peaks });
  }

  /**
   * Ensure Peaks is destroyed before unmounting (memory leaks).
   */
  public async componentWillUnmount() {
    const { peaks } = this.state;
    const destroyPeaks = await (peaks
      ? peaks.destroy()
      : Promise.reject(new Error("Unable to destroy Peaks instance; Peaks instance not truth-y.")));
  }

  public render() {
    const { peaks } = this.state;
    return (
      <div className="AudioPlayer">
        {peaks && [
          <Button mini key="play-button" color="primary" onClick={this.playAudio}>
            <PlayArrowRounded />
          </Button>,
          <Button mini key="pause-button" color="secondary" onClick={this.pauseAudio}>
            <Pause />
          </Button>,
          <Button mini key="download-labels" onClick={() => Label.exportLabels()}>
            <CloudDownload />
          </Button>,
          <Button
            mini
            key="label-button"
            color="primary"
            onClick={() => this.addLabel({ startTime: peaks.player.getCurrentTime() })}
          >
            <LabelImportant />
          </Button>,
          <Button mini key="test-data" color="secondary" onClick={() => this.spawnTestData()}>
            Foo
          </Button>,
        ]}

        <div
          className="peaks-container"
          ref={this.peaksContainerRef}
          style={{ width: "100%", minWidth: "20vw" }}
        >
          Peaks container
        </div>
        <audio src={this.props.audioURL} ref={this.audioElementRef} />
      </div>
    );
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Helpers
  ////////////////////////////////////////////////////////////////////////////////
  private playAudio = async () => {
    const { peaks } = this.state;
    return peaks
      ? peaks.player.play()
      : Promise.reject(new Error(`Failed to call play() on peaks instance; instance: ${peaks}`));
  };

  private pauseAudio = async () => {
    const { peaks } = this.state;
    return peaks
      ? peaks.player.pause()
      : Promise.reject(new Error(`Failed to call pause() on peaks instance; instance: ${peaks}`));
  };

  private addLabel = async (label: { startTime: number; endTime?: number; labelText?: string }) => {
    const { peaks, classificationText, audioFileP, audioBufferP } = this.state;
    const [startTime, endTime, labelText] = [
      label.startTime,
      label.endTime || label.startTime + 1, // Default to an endTime of startTime+1
      label.labelText || classificationText,
    ];
    const peaksSegmentId = Math.random()
      .toString(36)
      .substring(7);
    const peaksSegment = { id: peaksSegmentId, startTime, endTime, labelText };
    const slicedSegment = await Audio.sliceAudioBuffer(
      await audioBufferP,
      label.startTime,
      endTime,
    );
    // DANGEROUS!! Using Node `Buffer` in front-end code so we can save the segment to DB. Will appear as a Uint8Array on client side when queried
    const [audioFile, sampleData] = await Promise.all([
      audioFileP,
      DataBlob.create({
        blob: Buffer.from(WavEncoder.encode(slicedSegment)),
      }).save(),
    ]);
    const addPeaksSegment = peaks && peaks.segments.add(peaksSegment);
    const savedLabel = Label.create({
      startTime,
      endTime,
      audioFile,
      classification: labelText,
      sampleData,
    })
      .save()
      .catch((err) => {
        console.error(err);
        console.info(`Removing segment ${peaksSegmentId} from player`);
        const removePeakSegment = peaks && peaks.segments.removeById(peaksSegmentId);
        return Promise.reject(err);
      });

    return savedLabel;
  };

  private addLabelToPeaks = async (...labels: Label[]) => {
    const { peaks } = this.state;
    const segments = labels.map((l) => ({
      startTime: l.startTime,
      endTime: l.endTime,
      labelText: l.classification,
    }));
    if (peaks) {
      peaks.segments.add(segments);
    }
  };

  private getRecord = async () => {
    const { audioURL } = this.props;
    const props = {
      dirname: dirname(audioURL),
      basename: basename(audioURL),
    };
    return Database.getConnection().then(async (_) => {
      const record = await AudioFile.findOne(props);
      return record ? record : AudioFile.create(props).save();
    });
  };

  private labelToPeaksSegment = async (l: Label) => {
    return {
      startTime: l.startTime,
      endTime: l.endTime,
      labelText: l.classification,
    };
  };

  private getClassification = async (name: string) => {
    const c = await Classification.findOne({ name });
    return c || Classification.create({ name }).save();
  };

  private spawnTestData = async () => {
    const { peaks } = this.state;
    const randomLabels = [...Array(10)].map(() =>
      Math.random()
        .toString(36)
        .substring(7),
    );
    const audioBuffer = await this.state.audioBufferP;
    const audioDuration = audioBuffer.duration - 1; // -1 because total length might be round up
    const randomTimes = [...Array(1000)].map(() => Math.floor(Math.random() * audioDuration));
    for (const startTime of randomTimes) {
      const labelText = randomLabels[Math.floor(Math.random() * randomLabels.length)];
      const label = await this.addLabel({ startTime, labelText });
      await this.addLabelToPeaks(label);
    }
    // const labels = await Promise.all(
    //   randomTimes.map((startTime) => {
    //     const labelText = randomLabels[Math.floor(Math.random() * randomLabels.length)];
    //     return this.addLabel({ startTime, labelText }).then((label) => {
    //       this.addLabelToPeaks(label);
    //       return label;
    //     });
    //   }),
    // );
    // return labels;
  };
}
