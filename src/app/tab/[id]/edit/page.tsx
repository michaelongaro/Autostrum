import withPageScrollTarget from "~/components/Layout/withPageScrollTarget";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { cache } from "react";
import superjson from "superjson";
import { prisma } from "~/server/db";
import { createMetadata } from "~/utils/metadata";
import PageClient from "./page-client";

type Props = { params: Promise<{ id: string }> };
const getTab = cache(async (id: string) => {
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) return null;
  return prisma.tab.findUnique({
    where: { id: Number(id) },
    include: {
      artist: { select: { id: true, name: true, isVerified: true } },
    },
  });
});

export async function generateMetadata({ params }: Props) {
  const { userId } = await auth();
  const tab = userId ? await getTab((await params).id) : null;
  return createMetadata({
    title:
      tab?.createdByUserId === userId
        ? `Edit ${tab?.title} | Autostrum`
        : "Edit tab | Autostrum",
    noIndex: true,
  });
}

async function Page({ params }: Props) {
  const { userId } = await auth();
  const tab = await getTab((await params).id);
  if (!tab) notFound();
  const userAllowedToEdit = !!userId && tab.createdByUserId === userId;
  // Send the tab document to the browser only when the current user owns it.
  return (
    <PageClient
      json={superjson.stringify({
        userAllowedToEdit,
        tab: userAllowedToEdit
          ? {
              ...tab,
              artistId: tab.artist?.id ?? null,
              artistName: tab.artist?.name,
              artistIsVerified: tab.artist?.isVerified,
            }
          : { id: tab.id },
      })}
    />
  );
}

export default withPageScrollTarget(Page);
