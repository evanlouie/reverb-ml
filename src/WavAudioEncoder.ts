/**
 * TypeScript conversion of https://github.com/higuma/wav-audio-encoder-js
 */
export class WavAudioEncoder {
  private static min = Math.min;
  private static max = Math.max;
  private static setString = (view: DataView, offset: number, str: string) => {
    const len = str.length;
    for (let i = 0; i < len; ++i) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  public sampleRate: number;
  public numChannels: number;
  public numSamples: number;
  public dataViews: DataView[];

  constructor(sampleRate: number, numChannels: number) {
    this.sampleRate = sampleRate;
    this.numChannels = numChannels;
    this.numSamples = 0;
    this.dataViews = [];
  }

  public encode(buffer: Float32Array[]) {
    const len = buffer[0].length;
    const nCh = this.numChannels;
    const view = new DataView(new ArrayBuffer(len * nCh * 2));
    let offset = 0;
    for (let i = 0; i < len; ++i) {
      for (let ch = 0; ch < nCh; ++ch) {
        const x = buffer[ch][i] * 0x7fff;
        view.setInt16(
          offset,
          x < 0 ? WavAudioEncoder.max(x, -0x8000) : WavAudioEncoder.min(x, 0x7fff),
          true,
        );
        offset += 2;
      }
    }
    this.dataViews.push(view);
    this.numSamples += len;
  }

  public finish(): Blob {
    const dataSize = this.numChannels * this.numSamples * 2;
    const view = new DataView(new ArrayBuffer(44));
    WavAudioEncoder.setString(view, 0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    WavAudioEncoder.setString(view, 8, "WAVE");
    WavAudioEncoder.setString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, this.numChannels, true);
    view.setUint32(24, this.sampleRate, true);
    view.setUint32(28, this.sampleRate * 4, true);
    view.setUint16(32, this.numChannels * 2, true);
    view.setUint16(34, 16, true);
    WavAudioEncoder.setString(view, 36, "data");
    view.setUint32(40, dataSize, true);
    this.dataViews.unshift(view);
    const blob = new Blob(this.dataViews, { type: "audio/wav" });
    this.cleanup();
    return blob;
  }

  private cleanup() {
    delete this.dataViews;
  }
}
