/**
 * How many related tabs to show, and the smallest set worth padding out to
 * when stronger matches run short. Google does not need a deterministic set,
 * but a stable order keeps the HTML cacheable and the recommendations testable.
 */
export const RELATED_TAB_LIMIT = 8;
export const RELATED_TAB_MINIMUM = 4;

/**
 * A value shared by more than half the public catalog is treated like a
 * default (standard tuning, beginner difficulty, and so on). It can still
 * break ties, but it is not enough to call another tab "similar".
 */
const COMMON_VALUE_RATIO = 0.5;

const NON_DESCRIPTIVE_GENRES = new Set(["misc.", "misc"]);

export type RelatedTabSectionKind = "artist" | "similar" | "explore";

export interface RelatedTabSource {
  id: number;
  artistId: number | null;
  genre: string;
  tuning: string;
  difficulty: number;
  key: string | null;
  capo: number;
}

/**
 * Fields required to rank a tab. Card components can pass a wider object;
 * the extra display fields are preserved on the chosen rows.
 */
export interface RelatedTabCandidate extends RelatedTabSource {
  title: string;
}

export interface RelatedTabSection<T extends RelatedTabCandidate> {
  kind: RelatedTabSectionKind;
  tabs: T[];
}

interface AttributeMatch {
  descriptiveGenre: boolean;
  looseGenre: boolean;
  tuning: boolean;
  tuningUncommon: boolean;
  difficultyExact: boolean;
  difficultyNear: boolean;
  difficultyUncommon: boolean;
  key: boolean;
  keyUncommon: boolean;
  capo: boolean;
  capoUncommon: boolean;
}

interface Frequencies {
  total: number;
  genre: Map<string, number>;
  tuning: Map<string, number>;
  difficulty: Map<number, number>;
  key: Map<string, number>;
  capo: Map<number, number>;
}

/**
 * Saved tabs are public. Unpublished drafts stay in localStorage and never
 * become rows, so there is no private flag to filter here.
 */
export function isPubliclyListedTab(tab: { title: string }): boolean {
  return tab.title.trim().length > 0;
}

export function relatedTabSectionHeading(
  kind: RelatedTabSectionKind,
  artistName?: string | null,
): string {
  if (kind === "artist") {
    const name = artistName?.trim();
    return name ? `Other tabs by ${name}` : "Other tabs by this artist";
  }

  if (kind === "similar") return "Similar tabs";

  return "Explore more tabs";
}

export function selectRelatedTabSections<T extends RelatedTabCandidate>(
  source: RelatedTabSource,
  candidates: readonly T[],
): RelatedTabSection<T>[] {
  const uniqueCandidates = new Map<number, T>();

  for (const candidate of candidates) {
    if (candidate.id === source.id) continue;
    if (!isPubliclyListedTab(candidate)) continue;
    uniqueCandidates.set(candidate.id, candidate);
  }

  const publicCandidates = [...uniqueCandidates.values()];
  if (publicCandidates.length === 0) return [];

  const frequencies = buildFrequencies([source, ...publicCandidates]);
  const ranked = publicCandidates.toSorted((a, b) =>
    compareCandidates(source, a, b, frequencies),
  );

  const artistTabs: T[] = [];
  const similarTabs: T[] = [];
  const exploreTabs: T[] = [];

  for (const candidate of ranked) {
    if (isSameArtist(source, candidate)) {
      artistTabs.push(candidate);
      continue;
    }

    if (establishesSimilarity(source, candidate, frequencies)) {
      similarTabs.push(candidate);
      continue;
    }

    exploreTabs.push(candidate);
  }

  const selectedArtist = artistTabs.slice(0, RELATED_TAB_LIMIT);
  const selectedSimilar = similarTabs.slice(
    0,
    RELATED_TAB_LIMIT - selectedArtist.length,
  );
  const meaningfulCount = selectedArtist.length + selectedSimilar.length;

  const sections: RelatedTabSection<T>[] = [];

  if (selectedArtist.length > 0) {
    sections.push({ kind: "artist", tabs: selectedArtist });
  }

  if (selectedSimilar.length > 0) {
    sections.push({ kind: "similar", tabs: selectedSimilar });
  }

  const exploreCount =
    meaningfulCount === 0
      ? RELATED_TAB_LIMIT
      : Math.max(0, RELATED_TAB_MINIMUM - meaningfulCount);

  if (exploreCount > 0) {
    const selectedExplore = exploreTabs.slice(0, exploreCount);
    if (selectedExplore.length > 0) {
      sections.push({ kind: "explore", tabs: selectedExplore });
    }
  }

  return sections;
}

function compareCandidates(
  source: RelatedTabSource,
  a: RelatedTabCandidate,
  b: RelatedTabCandidate,
  frequencies: Frequencies,
): number {
  const aIsSameArtist = isSameArtist(source, a);
  const bIsSameArtist = isSameArtist(source, b);

  if (aIsSameArtist !== bIsSameArtist) {
    return aIsSameArtist ? -1 : 1;
  }

  const scoreDelta =
    similarityScore(source, b, frequencies) -
    similarityScore(source, a, frequencies);

  if (scoreDelta !== 0) return scoreDelta;

  return a.id - b.id;
}

function isSameArtist(
  source: RelatedTabSource,
  candidate: RelatedTabCandidate,
): boolean {
  return source.artistId != null && source.artistId === candidate.artistId;
}

function establishesSimilarity(
  source: RelatedTabSource,
  candidate: RelatedTabCandidate,
  frequencies: Frequencies,
): boolean {
  const match = attributeMatch(source, candidate, frequencies);

  return (
    match.descriptiveGenre ||
    (match.tuning && match.tuningUncommon) ||
    (match.difficultyExact && match.difficultyUncommon) ||
    (match.key && match.keyUncommon) ||
    (match.capo && match.capoUncommon)
  );
}

function similarityScore(
  source: RelatedTabSource,
  candidate: RelatedTabCandidate,
  frequencies: Frequencies,
): number {
  const match = attributeMatch(source, candidate, frequencies);
  let score = 0;

  if (match.descriptiveGenre) score += 100;
  else if (match.looseGenre) score += 10;

  if (match.tuning) score += match.tuningUncommon ? 40 : 8;
  if (match.difficultyExact) score += match.difficultyUncommon ? 24 : 4;
  else if (match.difficultyNear) score += 2;
  if (match.key) score += match.keyUncommon ? 20 : 4;
  if (match.capo) score += match.capoUncommon ? 16 : 1;

  return score;
}

function attributeMatch(
  source: RelatedTabSource,
  candidate: RelatedTabCandidate,
  frequencies: Frequencies,
): AttributeMatch {
  const sourceGenre = normalizeGenre(source.genre);
  const candidateGenre = normalizeGenre(candidate.genre);
  const genresMatch = sourceGenre.length > 0 && sourceGenre === candidateGenre;
  const descriptiveGenre =
    genresMatch && !NON_DESCRIPTIVE_GENRES.has(sourceGenre);

  const sourceTuning = comparableTuning(source.tuning);
  const candidateTuning = comparableTuning(candidate.tuning);
  const tuning =
    sourceTuning.length > 0 && sourceTuning === candidateTuning;

  const difficultyExact = source.difficulty === candidate.difficulty;
  const difficultyNear =
    !difficultyExact && Math.abs(source.difficulty - candidate.difficulty) === 1;

  const sourceKey = normalizeKey(source.key);
  const candidateKey = normalizeKey(candidate.key);
  const key = sourceKey != null && sourceKey === candidateKey;

  const capo = source.capo === candidate.capo;

  return {
    descriptiveGenre,
    looseGenre: genresMatch && !descriptiveGenre,
    tuning,
    tuningUncommon: tuning && isUncommon(frequencies.tuning, sourceTuning, frequencies.total),
    difficultyExact,
    difficultyNear,
    difficultyUncommon:
      difficultyExact &&
      isUncommon(frequencies.difficulty, source.difficulty, frequencies.total),
    key,
    keyUncommon:
      key && sourceKey != null && isUncommon(frequencies.key, sourceKey, frequencies.total),
    capo,
    capoUncommon: capo && isUncommon(frequencies.capo, source.capo, frequencies.total),
  };
}

function buildFrequencies(tabs: readonly RelatedTabSource[]): Frequencies {
  const frequencies: Frequencies = {
    total: tabs.length,
    genre: new Map(),
    tuning: new Map(),
    difficulty: new Map(),
    key: new Map(),
    capo: new Map(),
  };

  for (const tab of tabs) {
    const genre = normalizeGenre(tab.genre);
    if (genre) increment(frequencies.genre, genre);

    const tuning = comparableTuning(tab.tuning);
    if (tuning) increment(frequencies.tuning, tuning);

    increment(frequencies.difficulty, tab.difficulty);
    increment(frequencies.capo, tab.capo);

    const key = normalizeKey(tab.key);
    if (key) increment(frequencies.key, key);
  }

  return frequencies;
}

function increment<K>(map: Map<K, number>, key: K) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function isUncommon<K>(map: Map<K, number>, key: K, total: number): boolean {
  if (total <= 1) return true;
  return (map.get(key) ?? 0) / total <= COMMON_VALUE_RATIO;
}

function normalizeGenre(genre: string): string {
  return genre.trim().toLowerCase();
}

function normalizeKey(key: string | null): string | null {
  const normalized = key?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function comparableTuning(tuning: string): string {
  return tuning.trim().toLowerCase().replace(/\s+/g, " ");
}
