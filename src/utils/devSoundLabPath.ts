export const DEV_SOUND_LAB_PATH = "/dev-sound-lab";

/** True for the dev-only sound lab route, ignoring any query string. */
export function isDevSoundLabPath(path: string) {
  const pathname = path.split("?")[0] ?? "";
  return pathname === DEV_SOUND_LAB_PATH;
}
