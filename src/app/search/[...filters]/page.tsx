import withPageScrollTarget from "~/components/Layout/withPageScrollTarget";
import PageClient from "./page-client";
import { createMetadata } from "~/utils/metadata";

export const metadata = createMetadata({
  title: "Search | Autostrum",
  description:
    "Search guitar tabs by song or artist. Filter by genre, tuning, capo, and difficulty to find your next song to learn on Autostrum.",
  path: "/search/filters",
});

export default withPageScrollTarget(PageClient);
