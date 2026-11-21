import { prisma } from "~/server/db";
import { decodeRouteSegment } from "~/utils/decodeRouteSegment";
import { createMetadata } from "~/utils/metadata";

export async function artistMetadata(params: { name: string; id?: string }) {
  const routeName = decodeRouteSegment(params.name);
  const id =
    params.id && /^\d+$/.test(params.id) ? Number(params.id) : undefined;
  const artist = await prisma.artist.findFirst({
    where:
      id && Number.isSafeInteger(id)
        ? { id }
        : { name: { equals: routeName, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  const name = artist?.name ?? routeName;
  return createMetadata({
    title: `${name} | Autostrum`,
    description: `Discover guitar tabs by ${name}. Listen to interactive playback and learn their songs at your own pace on Autostrum.`,
    path: artist
      ? `/artist/${encodeURIComponent(name)}/${artist.id}/filters`
      : `/artist/${encodeURIComponent(name)}/filters`,
  });
}

export function userMetadata(username: string) {
  return createMetadata({
    title: `${username} | Autostrum`,
    description: `Explore guitar tabs created by ${username}. Listen, practice, and discover their music on Autostrum.`,
    path: `/user/${encodeURIComponent(username)}/filters`,
  });
}
