# Noto Sans

These local variable WOFF2 files replace `next/font/google` so compilation does
not depend on Google Fonts responses or Turbopack's Google font URL parser
([Next.js issue #99114](https://github.com/vercel/next.js/issues/99114)).

Both normal and italic retain the upstream character coverage. The width axis is
fixed at its default of 100%, and the weight axis covers the app's existing
400, 500, 600, and 700 weights. `next/font/local` handles asset URLs, preloading,
and fallback metrics, with `font-display: swap`.

## Source and license

- Source: [google/fonts, ofl/notosans](https://github.com/google/fonts/tree/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl/notosans)
- Revision: `8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5`
- Originals: `NotoSans[wdth,wght].ttf` and `NotoSans-Italic[wdth,wght].ttf`
- License: SIL Open Font License 1.1; see [OFL.txt](./OFL.txt).

## Regeneration

Download the original TTF files from the pinned revision above. With Python,
FontTools 4.68.0 and Brotli 1.2.1 installed, convert each file as follows (adjust
the input and output filenames for the italic variant):

```python
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

font = TTFont("NotoSans[wdth,wght].ttf")
instantiateVariableFont(font, {"wdth": 100, "wght": (400, 700)}, inplace=True)
font.flavor = "woff2"
font.save("noto-sans.woff2")
```

These tools are only needed when regenerating the assets; app builds use the
committed WOFF2 files directly.
