import withPageScrollTarget from "~/components/Layout/withPageScrollTarget";
import PageClient from "./page-client";
import { createMetadata } from "~/utils/metadata";

export const metadata = createMetadata({
  title: "Tools | Autostrum",
  description:
    "Build your guitar practice routine with free tools: a metronome, guitar tuner, chord trainer, scales, warm-up exercises, and a note trainer.",
  path: "/tools",
});

export default withPageScrollTarget(PageClient);
