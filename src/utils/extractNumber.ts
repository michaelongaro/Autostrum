export default function extractNumber(input: string): number {
  const numberString = input.replace(/\D/g, "");
  return Number(numberString);
}
