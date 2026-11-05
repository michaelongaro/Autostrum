import withPageScrollTarget from "~/components/Layout/withPageScrollTarget";
import PageClient from "./page-client";
import { createMetadata } from "~/utils/metadata";

export const metadata = createMetadata({
  title: "Note Trainer | Autostrum",
  description:
    "Train your ear by listening to notes and identifying their pitch. Customize note sets and audio sources with the free Autostrum note trainer.",
  path: "/tools/note-trainer",
});

export default withPageScrollTarget(PageClient);
