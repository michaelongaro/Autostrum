# Full-resolution image originals

`public/` mirrors the original image files from the app's public directory,
including unchanged icons and SVGs. These backups are outside Next.js's public
directory, so they are not served to visitors. Keep them for future image edits.
`manifest.json` records the SHA-256 checksum and byte size of every original,
plus dimensions and resulting sizes for resized images.

Run `node scripts/resizeImages.mjs` from the repository root to regenerate the
resized assets. It uses the originals here and never overwrites an existing
backup. New images are backed up on their first run; if deliberately replacing
an original, archive the old backup before installing the new full-resolution
source at the matching backup path.

The current sizes preserve aspect ratio and the existing CSS crop:

- Genre thumbnails cover a 500 by 144 CSS-pixel card at 2x density.
- Guitar photos cover a 384 by 192 CSS-pixel card at 2x density.
- The Explore header covers its maximum 1400 by 144 CSS-pixel banner at 2x density.
- Unused legacy desktop hero screenshots are limited to 1920 pixels wide.
- Mobile screenshots, signup screenshots, the social preview, icons, and SVGs
  already have suitable dimensions and retain their original bytes.

JPEGs use quality 84 and WebP thumbnails quality 82. PNG screenshots remain
lossless after resizing. Images are never enlarged.

To restore one original in PowerShell, for example:

```powershell
Copy-Item -LiteralPath assets/image-originals/public/genreThumbnails/rock.webp -Destination public/genreThumbnails/rock.webp
```

To restore all originals from the repository root:

```powershell
Copy-Item -Path assets/image-originals/public/* -Destination public -Recurse -Force
```
