export function getOrdinalSuffix(num: number) {
  const i = num % 10;
  const j = num % 100;
  if (i === 1 && j !== 11) {
    return `${num}st`;
  }
  if (i === 2 && j !== 12) {
    return `${num}nd`;
  }
  if (i === 3 && j !== 13) {
    return `${num}rd`;
  }
  return `${num}th`;
}
