import { Button } from "@material-ui/core";
import { Pause, PlayArrowRounded } from "@material-ui/icons";
import { writeFile } from "fs";
import { basename } from "path";
import PeaksJS, { PeaksInstance } from "peaks.js";
import React from "react";
import { promisify } from "util";
import { WavEncoder } from "../WavEncoder";

interface IAudioPlayerProps {
  audioURL: string;
}

interface IAudioPlayerState {
  audioContext: AudioContext;
  peaks: PeaksInstance | null;
}

export class AudioPlayer extends React.PureComponent<IAudioPlayerProps, IAudioPlayerState> {
  private static convertAudioToWav = async (fileUrl: string) => {
    /**
     * Convert a Blob to an ArrayBuffer
     * https://stackoverflow.com/questions/15341912/how-to-go-from-blob-to-arraybuffer
     */
    const blobToArrayBuffer = async (blob: Blob): Promise<ArrayBuffer> =>
      new Promise<ArrayBuffer>((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = (_) => {
          const { result } = fileReader;
          return result && typeof result !== "string"
            ? resolve(result)
            : reject(
                new Error(
                  `FileReader result invalid type; expected ArrayBuffer got: ${typeof result}: ${result}`,
                ),
              );
        };
        fileReader.readAsArrayBuffer(blob);
      });

    const offlineAudioContext = new OfflineAudioContext(2, 44100 * 40, 44100);
    // const audioNode = offlineAudioContext.createBufferSource();
    const audioBlob = await fetch(fileUrl).then((r) => r.blob());
    const audioArrayBuffer = await blobToArrayBuffer(audioBlob);

    const buffer = await offlineAudioContext.decodeAudioData(audioArrayBuffer);
    // const channels = [...Array(buffer.numberOfChannels)].map((_, i) => buffer.getChannelData(i));
    // const [ch1, ch2] = [buffer.getChannelData(1), buffer.getChannelData(2)];
    const wavBuffer = WavEncoder.encode(buffer);
    // const asBlob = new Blob([new Uint8Array(wavBuffer)], { type: "audio/wav" });
    // const downloadURL = URL.createObjectURL(asBlob);
    // console.log(wavBuffer, asBlob, downloadURL);

    /**
     * Write out the file to disk
     * Dangerously uses Node APIs
     */
    (async () => {
      const filename = basename(fileUrl) + ".wav";
      const fileWritten = await promisify(writeFile)(filename, new Uint8Array(wavBuffer)).then(() =>
        console.log(`Wrote out ${filename}`),
      );
    })();
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
    this.state = {
      audioContext: new AudioContext(),
      peaks: null,
    };
  }

  /**
   * On initial mount, initialize PeaksJS into DOM
   */
  public async componentDidMount() {
    const [peaksDiv, audioTag] = [this.peaksContainerRef.current, this.audioElementRef.current];
    const peaks = await (peaksDiv && audioTag
      ? PeaksJS.init({
          container: this.peaksContainerRef.current as HTMLDivElement,
          mediaElement: this.audioElementRef.current as HTMLAudioElement,
          audioContext: this.state.audioContext,
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
    return (
      <div className="AudioPlayer">
        <Button mini onClick={this.playAudio}>
          <PlayArrowRounded />
        </Button>
        <Button mini onClick={this.pauseAudio}>
          <Pause />
        </Button>
        <Button mini onClick={() => AudioPlayer.convertAudioToWav(this.props.audioURL)}>
          <Pause />
        </Button>
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
    const { peaks } = this.state;
    const peaksLabel = { endTime: label.startTime + 1, ...label }; // Default to an endTime of startTime+1
    return peaks
      ? peaks.segments.add(peaksLabel)
      : Promise.reject(new Error(`Failed to add label: ${peaksLabel}`));
  };
}
