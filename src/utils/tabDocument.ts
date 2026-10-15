import { z } from "zod";

const baseNoteLengths = z.union([
  z.literal("whole"),
  z.literal("half"),
  z.literal("quarter"),
  z.literal("eighth"),
  z.literal("sixteenth"),
]);

const fullNoteLengths = z.union([
  z.literal("whole"),
  z.literal("whole dotted"),
  z.literal("whole double-dotted"),
  z.literal("half"),
  z.literal("half dotted"),
  z.literal("half double-dotted"),
  z.literal("quarter"),
  z.literal("quarter dotted"),
  z.literal("quarter double-dotted"),
  z.literal("eighth"),
  z.literal("eighth dotted"),
  z.literal("eighth double-dotted"),
  z.literal("sixteenth"),
  z.literal("sixteenth dotted"),
  z.literal("sixteenth double-dotted"),
]);

// -----------------------------
// Section Progression
// -----------------------------
export const sectionProgressionSchema = z.object({
  id: z.string(),
  sectionId: z.string(),
  title: z.string(),
  repetitions: z.number(),
  startSeconds: z.number(),
  endSeconds: z.number(),
});

// -----------------------------
// Chord
// -----------------------------
export const chordSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  frets: z.array(z.string()), // keeping as string to match ITabSection
});

// -----------------------------
// Strum
// -----------------------------
const strumSchema = z.object({
  palmMute: z.union([
    z.literal(""),
    z.literal("-"),
    z.literal("start"),
    z.literal("end"),
  ]),
  strum: z.string(), // effects are v, ^, v~, ^~, >, s, ., r
  noteLength: fullNoteLengths,
  strumSpreadAuto: z.boolean().optional().default(true),
  strumSpreadSeconds: z.number().nullable().optional().default(null),
});

// -----------------------------
// Strumming Pattern
// -----------------------------
export const strummingPatternSchema = z.object({
  id: z.string(),
  baseNoteLength: baseNoteLengths,
  strums: z.array(strumSchema),
});

// -----------------------------
// Chord Sequence
// -----------------------------
const chordSequenceSchema = z.object({
  id: z.string(),
  strummingPattern: strummingPatternSchema,
  bpm: z.number(),
  repetitions: z.number(),
  data: z.array(z.string()), // array of chord names
});

// -----------------------------
// Chord Section
// -----------------------------
const chordSectionSchema = z.object({
  id: z.string(),
  type: z.literal("chord"),
  bpm: z.number(),
  repetitions: z.number(),
  data: z.array(chordSequenceSchema),
});

// -----------------------------
// Tab Note
// -----------------------------
const tabNoteSchema = z.object({
  type: z.literal("note"),
  palmMute: z.union([
    z.literal(""),
    z.literal("-"),
    z.literal("start"),
    z.literal("end"),
  ]),
  firstString: z.string(), // low E
  secondString: z.string(), // A
  thirdString: z.string(), // D
  fourthString: z.string(), // G
  fifthString: z.string(), // B
  sixthString: z.string(), // high E
  chordEffects: z.string(),
  noteLength: fullNoteLengths,
  strumSpreadAuto: z.boolean().optional().default(true),
  strumSpreadSeconds: z.number().nullable().optional().default(null),
  id: z.string(),
});

// -----------------------------
// Tab Measure Line
// -----------------------------
const tabMeasureLineSchema = z.object({
  type: z.literal("measureLine"),
  isInPalmMuteSection: z.boolean(),
  bpmAfterLine: z.number().nullable(),
  id: z.string(),
});

// -----------------------------
// Tab Section
// -----------------------------
const tabSectionSchema = z.object({
  id: z.string(),
  type: z.literal("tab"),
  bpm: z.number(),
  baseNoteLength: baseNoteLengths,
  repetitions: z.number(),
  data: z.array(
    z.discriminatedUnion("type", [tabNoteSchema, tabMeasureLineSchema]),
  ),
});

// -----------------------------
// Section
// -----------------------------
export const sectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  data: z.array(z.union([tabSectionSchema, chordSectionSchema])),
});

// Drafts accept unfinished metadata and empty music; publishing has its own checks.
export const tabDocumentSchema = z.object({
  title: z.string().max(50),
  artistId: z.number().int().positive().nullable(),
  artistName: z.string().max(60).optional(),
  artistIsVerified: z.boolean().optional(),
  description: z.string().max(500).nullable(),
  genre: z.string(),
  tuning: z.string(),
  bpm: z.number().finite(),
  capo: z.number().finite(),
  key: z.string().nullable(),
  difficulty: z.number().finite(),
  chords: z.array(chordSchema),
  strummingPatterns: z.array(strummingPatternSchema),
  sectionProgression: z.array(sectionProgressionSchema),
  tabData: z.array(sectionSchema),
});

export type TabDocument = z.input<typeof tabDocumentSchema>;

export const draftReferenceSchema = z.object({
  id: z.string().uuid(),
  revision: z.number().int().positive(),
});
export type DraftReference = z.infer<typeof draftReferenceSchema>;
