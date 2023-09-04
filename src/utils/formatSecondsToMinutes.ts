export default function formatSecondsToMinutes(rawSeconds: number): string {
  const minutes = Math.floor(Math.floor(rawSeconds) / 60);
  const seconds = Math.floor(rawSeconds) % 60;

  // This ensures the numbers are always at least two digits.
  const formattedMinutes =
    minutes < 10 ? "0" + `${minutes}` : minutes.toString();
  const formattedSeconds =
    seconds < 10 ? "0" + `${seconds}` : seconds.toString();

  return formattedMinutes + ":" + formattedSeconds;
}
