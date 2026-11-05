import withPageScrollTarget from "~/components/Layout/withPageScrollTarget";
import superjson from "superjson";
import { getExploreData } from "~/server/explorePage";
import PageClient from "./page-client";
import { createMetadata } from "~/utils/metadata";

export const metadata = createMetadata({
  title: "Explore | Autostrum",
  description:
    "Find your next song to learn. Browse guitar tabs by genre, discover popular tracks and new songs, and explore featured creators on Autostrum.",
  path: "/explore",
});

export const revalidate = 3600;
async function Page() {
  return <PageClient json={superjson.stringify(await getExploreData())} />;
}

export default withPageScrollTarget(Page);
