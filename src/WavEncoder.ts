/**
 * TypeScript Conversion of https://github.com/Jam3/audiobuffer-to-wav
 * @author Evan Louie <evan.louie@microsoft.com> (https://evanlouie.com)
 */
export class WavEncoder {
  /**
   * @param {AudioBuffer} buffer The AudioBuffer to encode
   * @param {float32: boolean} options If float32 is true, PCM Floating point at 32-bits/sample will be use; defaults to PCM Integer at 16-bits/sample will be used.
   * @see http://wavefilegem.com/how_wave_files_work.html
   */
  public static encode(buffer: AudioBuffer, { float32 } = { float32: false }) {
    const { numberOfChannels, sampleRate } = buffer;
    const format = float32 ? 3 : 1;
    const bitDepth = format === 3 ? 32 : 16;
    const audioData =
      numberOfChannels === 2
        ? this.interleave(buffer.getChannelData(0), buffer.getChannelData(1))
        : buffer.getChannelData(0);

    return this.encodeWAV(audioData, format, sampleRate, numberOfChannels, bitDepth);
  }

  private static encodeWAV(
    samples: Float32Array,
    format: 3 | 1,
    sampleRate: number,
    numChannels: number,
    bitDepth: 32 | 16,
  ) {
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
    const view = new DataView(buffer);

    /* RIFF identifier */
    this.writeString(view, 0, "RIFF");
    /* RIFF chunk length */
    view.setUint32(4, 36 + samples.length * bytesPerSample, true);
    /* RIFF type */
    this.writeString(view, 8, "WAVE");
    /* format chunk identifier */
    this.writeString(view, 12, "fmt ");
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, format, true);
    /* channel count */
    view.setUint16(22, numChannels, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * blockAlign, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, blockAlign, true);
    /* bits per sample */
    view.setUint16(34, bitDepth, true);
    /* data chunk identifier */
    this.writeString(view, 36, "data");
    /* data chunk length */
    view.setUint32(40, samples.length * bytesPerSample, true);
    if (format === 1) {
      // Raw PCM
      this.floatTo16BitPCM(view, 44, samples);
    } else {
      this.writeFloat32(view, 44, samples);
    }

    return buffer;
  }

  private static interleave(inputL: Float32Array, inputR: Float32Array) {
    const length = inputL.length + inputR.length;
    const result = new Float32Array(length);

    let index = 0;
    let inputIndex = 0;

    while (index < length) {
      result[index++] = inputL[inputIndex];
      result[index++] = inputR[inputIndex];
      inputIndex++;
    }
    return result;
  }

  private static writeFloat32(output: DataView, offset: number, input: Float32Array) {
    for (let i = 0; i < input.length; i++, offset += 4) {
      output.setFloat32(offset, input[i], true);
    }
  }

  private static floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  }

  private static writeString(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }
}
