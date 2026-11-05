import { readTabScreenshot } from "~/server/tabScreenshotStorage";
import { isTabScreenshotThumbnailWidth } from "~/utils/tabScreenshotThumbnails";

const noStore = { "Cache-Control": "no-store" };

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; theme: string }> },
) {
  const { id, theme } = await params;
  const search = new URL(request.url).searchParams;
  const v = search.get("v") ?? undefined;
  const width = search.get("width") ?? undefined;
  if (search.getAll("v").length > 1 || search.getAll("width").length > 1) {
    return new Response(null, { status: 400, headers: noStore });
  }
  const thumbnailWidth = width === undefined ? undefined : Number(width);
  if (
    typeof id !== "string" ||
    !/^\d+$/.test(id) ||
    (theme !== "light" && theme !== "dark") ||
    (v !== undefined &&
      (typeof v !== "string" || !Number.isFinite(Date.parse(v)))) ||
    (width !== undefined && typeof width !== "string") ||
    (thumbnailWidth !== undefined &&
      !isTabScreenshotThumbnailWidth(thumbnailWidth))
  ) {
    return new Response(null, { status: 400, headers: noStore });
  }

  try {
    const image = await readTabScreenshot({
      tabId: id,
      filename: `${theme}.jpeg`,
      version: v,
      width: thumbnailWidth,
    });
    if (!image) return new Response(null, { status: 404, headers: noStore });
    return new Response(new Uint8Array(image.body), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": image.cacheControl,
      },
    });
  } catch (error) {
    console.error("Could not load tab screenshot", {
      tabId: id,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return new Response(null, { status: 500, headers: noStore });
  }
}
