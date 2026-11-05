import withPageScrollTarget from "~/components/Layout/withPageScrollTarget";
import PageClient from "./page-client";
import { createMetadata } from "~/utils/metadata";

export const metadata = createMetadata({
  title: "Privacy Policy | Autostrum",
  description:
    "Read the Autostrum privacy policy to learn how we collect, use, and protect your personal information when you use our guitar tabs and practice tools.",
  path: "/privacy",
});

export default withPageScrollTarget(PageClient);
