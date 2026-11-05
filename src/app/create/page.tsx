import withPageScrollTarget from "~/components/Layout/withPageScrollTarget";
import PageClient from "./page-client";
import { createMetadata } from "~/utils/metadata";

export const metadata = createMetadata({
  title: "Create | Autostrum",
  description:
    "Write guitar tabs with chords and reusable strumming patterns. Hear your arrangement as you edit, save drafts, and share your music on Autostrum.",
  path: "/create",
});

export default withPageScrollTarget(PageClient);
