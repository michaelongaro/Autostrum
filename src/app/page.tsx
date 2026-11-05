import withPageScrollTarget from "~/components/Layout/withPageScrollTarget";
import PageClient from "./page-client";
import { createMetadata } from "~/utils/metadata";

export const metadata = createMetadata({ path: "/" });

export default withPageScrollTarget(PageClient);
