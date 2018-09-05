import { Button } from "@material-ui/core";
import { CloudDownload, LabelImportant, Pause, PlayArrowRounded } from "@material-ui/icons";
import { Buffer } from "buffer";
import { writeFile } from "fs";
import { basename, dirname } from "path";
import PeaksJS, { PeaksInstance, Segment } from "peaks.js";
import React from "react";
import { Audio } from "../Audio";
import { Database } from "../Database";
import { AudioFile } from "../entities/AudioFile";
import { Classification } from "../entities/Classification";
import { DataBlob } from "../entities/DataBlob";
import { Label } from "../entities/Label";
import { WavEncoder } from "../WavEncoder";

export interface IAudioPlayerProps {
  audioBlob: Blob;
  filepath: string; // actual location on filesystem
}

interface IAudioPlayerState {
  audioUrl: string;
  audioBuffer_: Promise<AudioBuffer>;
  audioContext: AudioContext;
  audioFile_: Promise<AudioFile>;
  classification_: Promise<Classification>;
  peaks: PeaksInstance | null;
}

export class AudioPlayer extends React.PureComponent<IAudioPlayerProps, IAudioPlayerState> {
  /**
   * DOM refs to keep track of elements for Peaks to mount
   */
  private peaksContainerRef: React.RefObject<HTMLDivElement>;
  private audioElementRef: React.RefObject<HTMLAudioElement>;

  constructor(props: IAudioPlayerProps) {
    super(props);
    this.peaksContainerRef = React.createRef<HTMLDivElement>();
    this.audioElementRef = React.createRef<HTMLAudioElement>();
    const { audioBlob } = this.props;
    const audioBuffer_ = new Response(audioBlob)
      .arrayBuffer()
      .then((buffer) => new OfflineAudioContext(2, 16000 * 40, 16000).decodeAudioData(buffer)); // two channels at 16000hz
    const defaultClassifier = { name: "Default Classifier" };
    const classification_ = Classification.findOne(defaultClassifier).then((c) => {
      return c ? c : Classification.create(defaultClassifier).save();
    });
    const audioFile_ = this.getRecord();
    this.state = {
      audioBuffer_,
      audioContext: new AudioContext(),
      audioUrl: URL.createObjectURL(audioBlob),
      audioFile_,
      classification_,
      peaks: null,
    };
  }

  /**
   * On initial mount, initialize PeaksJS into DOM
   */
  public async componentDidMount() {
    const { audioFile_ } = this.state;
    const [peaksDiv, audioTag] = [this.peaksContainerRef.current, this.audioElementRef.current];
    const audioFile = await audioFile_;
    const labels = await audioFile.getLabels();
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
    const { audioContext, peaks } = this.state;
    const _cleanupAudio = await Promise.all([audioContext.close(), peaks && peaks.destroy()]);
  }

  public render() {
    const { peaks, audioFile_ } = this.state;
    return (
      <div className="AudioPlayer">
        {peaks && [
          <Button mini key="play-button" color="primary" onClick={this.playAudio}>
            <PlayArrowRounded />
          </Button>,
          <Button mini key="pause-button" color="secondary" onClick={this.pauseAudio}>
            <Pause />
          </Button>,
          <Button
            mini
            key="download-labels"
            onClick={() =>
              audioFile_.then(({ id }) =>
                AudioFile.exportLabels(id).then(() => console.log("Export completed.")),
              )
            }
          >
            <CloudDownload />
          </Button>,
          <Button
            mini
            key="label-button"
            color="primary"
            onClick={() =>
              this.addLabel({
                startTime: peaks.player.getCurrentTime(),
                classification: "Default Class",
              })
            }
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
        <audio src={this.state.audioUrl} ref={this.audioElementRef} />
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

  private addLabel = async (label: {
    startTime: number;
    endTime?: number;
    classification: Classification | string;
  }) => {
    const { peaks, audioFile_, audioBuffer_, audioContext } = this.state;
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
      .substring(7);
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
    const peaksSegment = { id: peaksSegmentId, startTime, endTime, labelText: classification.name };
    const _addPeaksSegment = peaks && peaks.segments.add(peaksSegment);
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
        const _removePeakSegment = peaks && peaks.segments.removeById(peaksSegmentId);
        console.info(`Removing segment ${peaksSegmentId} from player`);
        return Promise.reject(err);
      });

    return savedLabel;
  };

  private addLabelToPeaks = async (...labels: Label[]) => {
    const { peaks } = this.state;
    const segments = labels.map((l) => ({
      startTime: l.startTime,
      endTime: l.endTime,
      labelText: l.classification.name,
    }));
    if (peaks) {
      peaks.segments.add(segments);
    }
  };

  private getRecord = async () => {
    const { filepath } = this.props;
    const props = {
      dirname: dirname(filepath),
      basename: basename(filepath),
    };
    return Database.getConnection().then(async (_) => {
      const record = await AudioFile.findOne(props);
      return record ? record : AudioFile.create(props).save();
    });
  };

  private labelToPeaksSegment = async ({
    startTime,
    endTime,
    classification,
  }: Label): Promise<Segment> => ({
    startTime,
    endTime,
    labelText: classification.name,
  });

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
}
