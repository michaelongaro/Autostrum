import withPageScrollTarget from "~/components/Layout/withPageScrollTarget";
import PageClient from "./page-client";
import { createMetadata } from "~/utils/metadata";

export const metadata = createMetadata({
  title: "Warm-up Exercises | Autostrum",
  description:
    "Warm up with interactive guitar exercises for finger strength, coordination, and dexterity. Play along at your own pace across different skill levels.",
  path: "/tools/warmups",
});

export default withPageScrollTarget(PageClient);
