import { notFound } from "next/navigation";
import { notoSans } from "~/components/Layout/siteFont";
import type { Chord, Section } from "~/stores/TabStore";
import Preview from "./preview";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function ScreenshotPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = /^\d+$/.test(idParam) ? Number(idParam) : 0;
  if (!Number.isSafeInteger(id) || id < 1) notFound();

  const { prisma } = await import("~/server/db");
  const tab = await prisma.tab.findUnique({
    where: { id },
    select: {
      updatedAt: true,
      bpm: true,
      tuning: true,
      chords: true,
      tabData: true,
    },
  });
  if (!tab) notFound();

  return (
    <main className={notoSans.className}>
      <Preview
        key={tab.updatedAt.toISOString()}
        id={id}
        version={tab.updatedAt.toISOString()}
        bpm={tab.bpm}
        tuning={tab.tuning}
        chords={tab.chords as unknown as Chord[]}
        tabData={(tab.tabData as unknown as Section[]).slice(0, 2)}
      />
    </main>
  );
}
