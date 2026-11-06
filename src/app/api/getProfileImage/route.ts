import { isRemoteProfileImage } from "~/utils/profileImage";

const FALLBACK_AVATAR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#e5e7eb"/><circle cx="32" cy="24" r="12" fill="#6b7280"/><path d="M10 60a22 22 0 0 1 44 0" fill="#6b7280"/></svg>`;
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get("url");
  if (!src || src.length > 2048 || !isRemoteProfileImage(src)) {
    return new Response("Invalid profile image URL", { status: 400 });
  }

  try {
    // Stored avatars can outlive their Clerk upload. Resolve failures here so
    // every profile surface receives an image instead of a broken resource.
    // Never follow redirects outside the explicit host allowlist.
    const image = await fetch(src, {
      redirect: "error",
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 3600 },
    });
    const contentType = image.headers.get("content-type")?.split(";")[0] ?? "";
    if (image.ok && IMAGE_TYPES.has(contentType)) {
      return new Response(image.body, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    await image.body?.cancel();
  } catch {
    // A deleted upload or unavailable provider uses the same local fallback.
  }

  return new Response(FALLBACK_AVATAR, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
