import withPageScrollTarget from "~/components/Layout/withPageScrollTarget";
import PageClient from "./page-client";
import { createMetadata } from "~/utils/metadata";

export const metadata = createMetadata({
  title: "Scales Practice | Autostrum",
  description:
    "Learn guitar scales with visual fretboard patterns and interactive audio playback. Practice moving through scale shapes at your own pace on Autostrum.",
  path: "/tools/scales",
});

export default withPageScrollTarget(PageClient);
