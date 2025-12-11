/**
 * One-off migration script to remove all "noteLengthModified" keys from tabData in existing tabs.
 *
 * This script:
 * 1. Fetches all tabs from the database
 * 2. Parses the tabData JSON field for each tab
 * 3. Removes "noteLengthModified" from:
 *    - TabNote objects (in TabSection.data[])
 *    - Strum objects (in ChordSection.data[].strummingPattern.strums[])
 * 4. Updates the tab with the cleaned data
 *
 * Run with: npx tsx src/scripts/removeNoteLengthModified.ts
 */

import { PrismaClient } from "../generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
  log: ["error"],
});

// Type definitions matching the old schema
interface Strum {
  palmMute: "" | "-" | "start" | "end";
  strum: string;
  noteLength: string;
  noteLengthModified?: boolean; // the key we want to remove
}

interface StrummingPattern {
  id: string;
  baseNoteLength: string;
  strums: Strum[];
}

interface ChordSequence {
  id: string;
  strummingPattern: StrummingPattern;
  bpm: number;
  repetitions: number;
  data: string[];
}

interface ChordSection {
  id: string;
  type: "chord";
  bpm: number;
  repetitions: number;
  data: ChordSequence[];
}

interface TabNote {
  type: "note";
  palmMute: "" | "-" | "start" | "end";
  firstString: string;
  secondString: string;
  thirdString: string;
  fourthString: string;
  fifthString: string;
  sixthString: string;
  chordEffects: string;
  noteLength: string;
  noteLengthModified?: boolean; // the key we want to remove
  id: string;
}

interface TabMeasureLine {
  type: "measureLine";
  isInPalmMuteSection: boolean;
  bpmAfterLine: number | null;
  id: string;
}

interface TabSection {
  id: string;
  type: "tab";
  bpm: number;
  baseNoteLength: string;
  repetitions: number;
  data: (TabNote | TabMeasureLine)[];
}

interface Section {
  id: string;
  title: string;
  data: (TabSection | ChordSection)[];
}

type TabData = Section[];

function removeNoteLengthModifiedFromTabData(tabData: TabData): {
  data: TabData;
  keysRemoved: number;
} {
  let keysRemoved = 0;

  const cleanedData = tabData.map((section) => ({
    ...section,
    data: section.data.map((subSection) => {
      if (subSection.type === "tab") {
        // Handle TabSection
        const tabSection = subSection as TabSection;
        return {
          ...tabSection,
          data: tabSection.data.map((item) => {
            if (item.type === "note") {
              const tabNote = item as TabNote;
              if ("noteLengthModified" in tabNote) {
                keysRemoved++;
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { noteLengthModified, ...rest } = tabNote;
                return rest;
              }
            }
            return item;
          }),
        };
      } else if (subSection.type === "chord") {
        // Handle ChordSection
        const chordSection = subSection as ChordSection;
        return {
          ...chordSection,
          data: chordSection.data.map((chordSequence) => ({
            ...chordSequence,
            strummingPattern: {
              ...chordSequence.strummingPattern,
              strums: chordSequence.strummingPattern.strums.map((strum) => {
                if ("noteLengthModified" in strum) {
                  keysRemoved++;
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { noteLengthModified, ...rest } = strum;
                  return rest;
                }
                return strum;
              }),
            },
          })),
        };
      }
      return subSection;
    }),
  }));

  return { data: cleanedData, keysRemoved };
}

async function removeNoteLengthModified() {
  console.log(
    'Starting migration to remove "noteLengthModified" keys from tabData...\n',
  );

  try {
    // Fetch all tabs
    const tabs = await prisma.tab.findMany({
      select: {
        id: true,
        title: true,
        tabData: true,
      },
    });

    console.log(`Found ${tabs.length} tabs to process.\n`);

    let tabsUpdated = 0;
    let totalKeysRemoved = 0;

    for (const tab of tabs) {
      try {
        const tabData = tab.tabData as unknown as TabData;

        if (!Array.isArray(tabData) || tabData.length === 0) {
          console.log(`Tab ${tab.id} (${tab.title}) has no tabData, skipping.`);
          continue;
        }

        const { data: cleanedData, keysRemoved } =
          removeNoteLengthModifiedFromTabData(tabData);

        if (keysRemoved === 0) {
          console.log(
            `Tab ${tab.id} (${tab.title}) has no noteLengthModified keys, skipping.`,
          );
          continue;
        }

        // Update the tab with cleaned data
        await prisma.tab.update({
          where: { id: tab.id },
          data: {
            tabData: cleanedData as unknown as object,
          },
        });

        tabsUpdated++;
        totalKeysRemoved += keysRemoved;
        console.log(
          `Tab ${tab.id} (${tab.title}): Removed ${keysRemoved} noteLengthModified keys.`,
        );
      } catch (error) {
        console.error(`Error processing tab ${tab.id} (${tab.title}):`, error);
      }
    }

    console.log("\n--- Migration Summary ---");
    console.log(`Total tabs processed: ${tabs.length}`);
    console.log(`Tabs updated: ${tabsUpdated}`);
    console.log(`Total noteLengthModified keys removed: ${totalKeysRemoved}`);
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
removeNoteLengthModified()
  .then(() => {
    console.log("\nMigration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nMigration failed with error:", error);
    process.exit(1);
  });
