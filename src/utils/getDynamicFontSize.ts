function getDynamicFontSize(
  text: string,
  minFontSize: number,
  maxFontSize: number,
  maxLength: number,
) {
  if (!text || text.length === 0) {
    return `${maxFontSize}px`;
  }

  // TODO: test this, but I am feeling like most viewport arrangements can always handle
  // 15 chars at the max font size
  if (text.length < 15) {
    return `${maxFontSize}px`;
  }

  const length = Math.min(text.length, maxLength);
  const fontSize = Math.round(
    maxFontSize - ((maxFontSize - minFontSize) * length) / maxLength,
  );
  return `${fontSize}px`;
}

export default getDynamicFontSize;
