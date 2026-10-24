# Social preview source

`homepage-hero-desktop.png` captures the dark desktop homepage hero without the
site header or lower homepage sections. Its 1600 × 840 frame preserves the entire
tablature player, including the navigation tabs and playback controls.
The capture scales the hero content to 92% around its center, leaving roughly
65–70 pixels of horizontal padding on each side of the final social preview.

With the dev server running, use `node scripts/updateHomepageScreenshots.mjs`
to refresh the player from the homepage component in both this source and the
960 × 455 README image. It preserves the existing perspective frames and checks
that every pixel outside the players is unchanged, including the README header
and avatar and the social preview's copy and background.

Then run `node scripts/generateOpenGraphImage.mjs` to resize this source
proportionally to the public 1200 × 630 Open Graph and Twitter preview. Keep the
source at the same 40:21 aspect ratio so no content needs cropping.

A fresh capture must preserve the authored `.playbackModalGradient` background
from `src/styles/globals.css`. Exporting `CSSStyleRule.cssText` can omit this
gradient and make the panel transparent, exposing the glow behind it.
