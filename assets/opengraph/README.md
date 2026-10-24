# Social preview source

`homepage-hero-desktop.png` captures the dark desktop homepage hero without the
site header or lower homepage sections. Its 1600 × 840 frame preserves the entire
tablature player, including the navigation tabs and playback controls.
The capture scales the hero content to 92% around its center, leaving roughly
65–70 pixels of horizontal padding on each side of the final social preview.

Run `node scripts/generateOpenGraphImage.mjs` to resize this source proportionally
to the public 1200 × 630 Open Graph and Twitter preview. Keep the source at the
same 40:21 aspect ratio when updating the capture so no content needs cropping.

A fresh capture must preserve the authored `.playbackModalGradient` background
from `src/styles/globals.css`. Exporting `CSSStyleRule.cssText` can omit this
gradient and make the panel transparent, exposing the glow behind it.
