// Preserve the palette hue while giving action text a 5.5:1 contrast budget,
// including room for the button's translucent hover state on a light surface.
function rgb(hsl) {
  const [h, s, l] = hsl.match(/[\d.]+/g).map(Number);
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  return [0, 8, 4].map((n) => {
    const k = (n + h / 30) % 12;
    return l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  });
}
function luminance(hsl) {
  return rgb(hsl).reduce(
    (sum, v, i) =>
      sum +
      [0.2126, 0.7152, 0.0722][i] *
        (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4),
    0,
  );
}
export function contrastRatio(a, b) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function accessibleActionColor(primary, foreground) {
  const [h, s, lightness] = primary.match(/[\d.]+/g).map(Number);
  let l = lightness;
  while (l > 0 && contrastRatio(`${h} ${s}% ${l}%`, foreground) < 5.5) l -= 0.5;
  return `${h} ${s}% ${Math.max(0, l).toFixed(2)}%`;
}
