export default function formatSecondsToMinutes(rawSeconds: number): string {
  const minutes = Math.floor(rawSeconds / 60);
  const seconds = Math.floor(rawSeconds) % 60;

  // Minutes will be displayed as-is without a leading zero.
  const formattedMinutes = minutes.toString();

  // This ensures seconds are always displayed with at least two digits.
  const formattedSeconds =
    seconds < 10 ? "0" + `${seconds}` : seconds.toString();

  return formattedMinutes + ":" + formattedSeconds;
}
