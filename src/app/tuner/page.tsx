import withPageScrollTarget from "~/components/Layout/withPageScrollTarget";
import PageClient from "./page-client";
import { createMetadata } from "~/utils/metadata";

export const metadata = createMetadata({
  title: "Tuner | Autostrum",
  description:
    "Tune your guitar online using your microphone. Check string pitch with the free Autostrum guitar tuner, with support for alternate and custom tunings.",
  path: "/tuner",
});

export default withPageScrollTarget(PageClient);
