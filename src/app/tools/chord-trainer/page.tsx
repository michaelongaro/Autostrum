import withPageScrollTarget from "~/components/Layout/withPageScrollTarget";
import PageClient from "./page-client";
import { createMetadata } from "~/utils/metadata";

export const metadata = createMetadata({
  title: "Chord Trainer | Autostrum",
  description:
    "Practice smoother guitar chord changes with preset progressions or your own chords. Add strumming patterns and adjust the tempo on Autostrum.",
  path: "/tools/chord-trainer",
});

export default withPageScrollTarget(PageClient);
