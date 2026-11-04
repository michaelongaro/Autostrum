import type { Section, SectionProgression } from "~/stores/TabStore";

export function generateDefaultSectionProgression(
  tabData: Pick<Section, "id" | "title">[],
): SectionProgression[] {
  return tabData.map((section) => ({
    id: crypto.randomUUID(),
    sectionId: section.id,
    title: section.title,
    repetitions: 1,
    startSeconds: 0,
    endSeconds: 0,
  }));
}

/** Preserve custom ordering, repeats, and intentionally omitted sections. */
export function ensureSectionProgression(
  tabData: Pick<Section, "id" | "title">[],
  sectionProgression: SectionProgression[] | null | undefined,
): SectionProgression[] {
  return sectionProgression?.length
    ? sectionProgression
    : generateDefaultSectionProgression(tabData);
}
