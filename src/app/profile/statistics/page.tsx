import withPageScrollTarget from "~/components/Layout/withPageScrollTarget";
import PageClient from "./page-client";
import { createMetadata } from "~/utils/metadata";

export const metadata = createMetadata({
  title: "Statistics | Autostrum",
  description:
    "See statistics for your Autostrum guitar tabs, including views, ratings, bookmarks, top songs, and genres.",
  noIndex: true,
});

export default withPageScrollTarget(PageClient);
