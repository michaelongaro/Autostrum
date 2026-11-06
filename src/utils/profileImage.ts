const PROFILE_IMAGE_HOSTS = new Set([
  "img.clerk.com",
  "images.clerk.dev",
  "www.gravatar.com",
]);

export function isRemoteProfileImage(src: string) {
  try {
    const url = new URL(src);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      PROFILE_IMAGE_HOSTS.has(url.hostname)
    );
  } catch {
    return false;
  }
}

export function getProfileImageSrc(src: string) {
  // Cropped data URLs and local previews stay local.
  return isRemoteProfileImage(src)
    ? `/api/getProfileImage?url=${encodeURIComponent(src)}`
    : src;
}
