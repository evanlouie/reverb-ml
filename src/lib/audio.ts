/**
 * Slice an AudioBuffer (immutable)
 * @returns {Promise<AudioBuffer>} (new) with buffered with data starting from `start` seconds and ending at
 * `end` seconds from the original `buffer`
 */
export const sliceAudioBuffer = async (
  buffer: AudioBuffer,
  start: number,
  end: number,
): Promise<AudioBuffer> => {
  const { duration, sampleRate, numberOfChannels, length } = buffer;
  const isValidTimeFrame = start < end && end < duration;
  if (isValidTimeFrame === false) {
    throw new Error(
      `Invalid start and/or end time; start must be less than end and end must be less than total duration; ${start} < ${end} < ${duration}`,
    );
  }
  const [startSample, endSample] = [start, end].map((time) => time * sampleRate);
  const sectionLength = endSample - startSample;
  const audioCtx = new OfflineAudioContext(numberOfChannels, sectionLength, sampleRate);
  const sliceBuffer = audioCtx.createBuffer(numberOfChannels, sectionLength, sampleRate);

  // Copy slices of channels into new buffer
  [...Array(numberOfChannels)]
    .map((_, i) => buffer.getChannelData(i))
    .map((channelData) => channelData.slice(startSample, endSample))
    .forEach((floatArr, channel) => sliceBuffer.copyToChannel(floatArr, channel));

  return sliceBuffer;
};
