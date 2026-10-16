import type { Section, SectionProgression } from "~/stores/TabStore";

/**
 * Appends tab sections that appeared since the last compile to an existing
 * section progression. Uses a caller-owned Set of known section IDs so that:
 * - Newly created sections are included in playback metadata
 * - Sections the user intentionally removed from the progression are NOT
 *   re-added (their IDs remain "known")
 *
 * O(sections) — section counts are tiny, so this stays off the hot path cost.
 * Returns the same array reference when nothing needs appending.
 */
function appendNewlyAddedSectionsToProgression({
  tabData,
  sectionProgression,
  knownSectionIds,
}: {
  tabData: Section[];
  sectionProgression: SectionProgression[];
  knownSectionIds: Set<string>;
}): SectionProgression[] {
  if (sectionProgression.length === 0 || tabData.length === 0) {
    // Empty progression means "use all sections" via generateDefault.
    // Just refresh the known-ID set from current tabData.
    knownSectionIds.clear();
    for (const section of tabData) {
      knownSectionIds.add(section.id);
    }
    return sectionProgression;
  }

  const progressionSectionIds = new Set(
    sectionProgression.map((entry) => entry.sectionId),
  );

  let nextProgression: SectionProgression[] | null = null;

  for (const section of tabData) {
    const isNewSection = !knownSectionIds.has(section.id);
    knownSectionIds.add(section.id);

    if (!isNewSection || progressionSectionIds.has(section.id)) {
      continue;
    }

    if (nextProgression === null) {
      nextProgression = sectionProgression.slice();
    }

    nextProgression.push({
      id: crypto.randomUUID(),
      sectionId: section.id,
      title: section.title,
      repetitions: 1,
      startSeconds: 0,
      endSeconds: 0,
    });
    progressionSectionIds.add(section.id);
  }

  // Drop IDs for sections that no longer exist in tabData so a later
  // recreate-with-same-flow doesn't treat a brand-new section as "known".
  if (knownSectionIds.size !== tabData.length) {
    const liveIds = new Set(tabData.map((section) => section.id));
    for (const id of knownSectionIds) {
      if (!liveIds.has(id)) {
        knownSectionIds.delete(id);
      }
    }
  }

  return nextProgression ?? sectionProgression;
}

export { appendNewlyAddedSectionsToProgression };
