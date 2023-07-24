export default function getRepetitions(repetitions: number | undefined) {
  // currently, if repetition input is empty, the value gets set to -1
  if (repetitions === undefined || repetitions === -1) {
    return 1;
  }
  return repetitions;
}
