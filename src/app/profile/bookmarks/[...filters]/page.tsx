import withPageScrollTarget from "~/components/Layout/withPageScrollTarget";
import PageClient from "./page-client";
import { createMetadata } from "~/utils/metadata";

export const metadata = createMetadata({
  title: "My Bookmarks | Autostrum",
  description: "Browse and organize your bookmarked guitar tabs on Autostrum.",
  noIndex: true,
});

export default withPageScrollTarget(PageClient);
