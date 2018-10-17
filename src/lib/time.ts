/**
 * Convert seconds to HH-mm-ss.SSS format
 * @param duration {number} duration in seconds to convert
 */
export const secondsToTime = (duration: number) => {
  const hours = Math.floor(duration / (60 * 60)).toString() // indefinite length
  const minutes = (Math.floor(duration / 60) % 60).toString() // max 2 digits
  const seconds = (Math.floor(duration) % 60).toString() // max 2 digits
  const milliseconds = Math.round((duration * 1000) % 1000).toString() // max 3 digits

  const HH = ["0", "0"]
    .concat(hours.split(""))
    .slice(-2)
    .join("")
  const mm = ["0", "0"]
    .concat(minutes.split(""))
    .slice(-2)
    .join("")
  const ss = ["0", "0"]
    .concat(seconds.split(""))
    .slice(-2)
    .join("")
  const SSS = ["0", "0", "0"]
    .concat(milliseconds.split(""))
    .slice(-3)
    .join("")

  return `${HH}-${mm}-${ss}.${SSS}`
}
