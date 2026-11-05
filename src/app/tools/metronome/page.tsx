import withPageScrollTarget from "~/components/Layout/withPageScrollTarget";
import PageClient from "./page-client";
import { createMetadata } from "~/utils/metadata";

export const metadata = createMetadata({
  title: "Metronome | Autostrum",
  description:
    "Practice your timing with our metronome. Set your tempo, time signature, subdivisions, and accents, or build speed with our Speed Trainer.",
  path: "/tools/metronome",
});

export default withPageScrollTarget(PageClient);
