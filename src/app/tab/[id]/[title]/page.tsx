import { notFound } from "next/navigation";
import superjson from "superjson";
import { getTabPageData } from "~/server/tabPage";
import { createMetadata } from "~/utils/metadata";
import PageClient from "./page-client";
import withPageScrollTarget from "~/components/Layout/withPageScrollTarget";

type Props = { params: Promise<{ id: string; title: string }> };

export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props) {
  const data = await getTabPageData((await params).id);
  return data
    ? createMetadata({ ...data.openGraphData, path: data.openGraphData.url })
    : createMetadata({ title: "Tab not found | Autostrum", noIndex: true });
}

async function Page({ params }: Props) {
  const data = await getTabPageData((await params).id);
  if (!data) notFound();
  return <PageClient json={superjson.stringify(data)} />;
}

export default withPageScrollTarget(Page);
