import type { Page } from "playwright";
import sharp from "sharp";
import {
  TAB_SCREENSHOT_MASK_HEIGHT,
  TAB_SCREENSHOT_MASK_ROLES,
  TAB_SCREENSHOT_MASK_WIDTH,
} from "./tabScreenshotMasks";

/** Capture color contributions before flattening, not from the existing JPEG.
 *  Each basis render sets one role to white and all other roles to black.
 *  Original opacity, occlusion, shadows, and antialiasing remain intact. */
export async function captureTabScreenshotMasks(page: Page): Promise<Buffer> {
  await page
    .locator("#tabPreviewScreenshotLight")
    .waitFor({ state: "visible" });
  await page.evaluate(() => document.fonts.ready);
  // Render a DOM snapshot at integer coordinates, outside scrolling/clipping
  // ancestors. Locator screenshots of the original fractional position can
  // include a row of pixels from the surrounding page at the crop boundary.
  await page.evaluate(() => {
    const original = document.getElementById("tabPreviewScreenshotLight")!;
    const capture = original.cloneNode(true) as HTMLElement;
    capture.id = "tabScreenshotMaskCapture";
    Object.assign(capture.style, {
      position: "fixed",
      left: "0",
      top: "0",
      margin: "0",
      zIndex: "2147483647",
      isolation: "isolate",
      overflow: "hidden",
    });
    document.body.append(capture);
  });
  const preview = page.locator("#tabScreenshotMaskCapture");

  const style = await page.addStyleTag({
    content: `
      nextjs-portal { display: none !important; }
      #tabScreenshotMaskCapture { filter: none !important; }
      #tabScreenshotMaskCapture, #tabScreenshotMaskCapture * {
        --background: var(--screenshot-background) !important;
        --foreground: var(--screenshot-foreground) !important;
        --border: var(--screenshot-border) !important;
        transition: none !important;
        animation: none !important;
      }
    `,
  });

  async function setRole(activeRole: string | null) {
    await page.evaluate(
      ({ roles, activeRole }) => {
        const root = document.getElementById("tabScreenshotMaskCapture")!;
        // Inner data-color/data-theme wrappers define their own tokens.
        for (const node of [
          root,
          ...root.querySelectorAll<HTMLElement>("[data-color][data-theme]"),
        ]) {
          for (const role of roles) {
            node.style.setProperty(
              `--${role}`,
              role === activeRole ? "0 0% 100%" : "0 0% 0%",
              "important",
            );
          }
        }
      },
      { roles: [...TAB_SCREENSHOT_MASK_ROLES], activeRole },
    );
  }

  try {
    await setRole(null);
    const baseline = await sharp(
      await preview.screenshot({ type: "png", animations: "disabled" }),
    )
      .removeAlpha()
      .raw()
      .toBuffer();
    // An unexpected fixed color would be counted in every mask. Fail the
    // capture instead of silently uploading a visibly incorrect atlas.
    if (baseline.some((channel) => channel > 1)) {
      throw new Error("Screenshot preview contains an unmapped color role");
    }

    const layers: Buffer[] = [];
    for (const role of TAB_SCREENSHOT_MASK_ROLES) {
      await setRole(role);
      const coverage = await sharp(
        await preview.screenshot({ type: "png", animations: "disabled" }),
      )
        .resize(TAB_SCREENSHOT_MASK_WIDTH, TAB_SCREENSHOT_MASK_HEIGHT)
        .removeAlpha()
        .extractChannel(0)
        .raw()
        .toBuffer();

      const rgba = Buffer.alloc(coverage.length * 4, 255);
      for (let pixel = 0; pixel < coverage.length; pixel++) {
        rgba[pixel * 4 + 3] = coverage[pixel]!;
      }
      layers.push(rgba);
    }

    return await sharp(Buffer.concat(layers), {
      raw: {
        width: TAB_SCREENSHOT_MASK_WIDTH,
        height: TAB_SCREENSHOT_MASK_HEIGHT * TAB_SCREENSHOT_MASK_ROLES.length,
        channels: 4,
      },
    })
      .png({ compressionLevel: 9 })
      .toBuffer();
  } finally {
    await style.evaluate((node: HTMLStyleElement) => node.remove());
    await preview.evaluate((node) => node.remove());
  }
}
