/**
 * One-off migration script to convert tab data from legacy string[][] format
 * to the new typed TabNote/TabMeasureLine format.
 *
 * Run with: npx tsx scripts/migrateTabDataSchema.ts
 *
 * ⚠️ IMPORTANT: Test this on a development database first!
 * Make sure to back up your production database before running.
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Types matching the new schema in TabStore.ts
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
  noteLengthModified: boolean;
  id: string;
}

interface TabMeasureLine {
  type: "measureLine";
  isInPalmMuteSection: boolean;
  bpmAfterLine: number | null;
  id: string;
}

interface LegacyTabSection {
  id: string;
  type: "tab";
  bpm: number;
  baseNoteLength: string;
  repetitions: number;
  data: string[][]; // Legacy format
}

interface NewTabSection {
  id: string;
  type: "tab";
  bpm: number;
  baseNoteLength: string;
  repetitions: number;
  data: (TabNote | TabMeasureLine)[];
}

interface ChordSection {
  id: string;
  type: "chord";
  bpm: number;
  repetitions: number;
  data: unknown[];
}

interface Section {
  id: string;
  title: string;
  data: (LegacyTabSection | ChordSection | NewTabSection)[];
}

// Legacy array format:
// [0]=palmMute, [1]=firstString(lowE), [2]=secondString, ..., [6]=sixthString(highE),
// [7]=chordEffects, [8]=noteLength, [9]=noteLengthModified, [10]=id

function isLegacyFormat(data: unknown): data is string[][] {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return true; // Empty array is valid
  // Check if first element is an array of strings
  const firstItem = data[0];
  return (
    Array.isArray(firstItem) && firstItem.every((v) => typeof v === "string")
  );
}

function isNewFormat(data: unknown): data is (TabNote | TabMeasureLine)[] {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return true; // Empty array is valid
  // Check if first element has a "type" property
  const firstItem = data[0] as { type?: string };
  return (
    typeof firstItem === "object" &&
    firstItem !== null &&
    "type" in firstItem &&
    (firstItem.type === "note" || firstItem.type === "measureLine")
  );
}

function isMeasureLine(column: string[]): boolean {
  // A measure line has "|" in string positions [1-6] and "measureLine" in position [8]
  return (
    column[8] === "measureLine" || (column[1] === "|" && column[2] === "|")
  );
}

function convertLegacyColumnToTyped(
  column: string[],
): TabNote | TabMeasureLine {
  if (isMeasureLine(column)) {
    // Convert measure line
    const bpmValue = column[7];
    const bpmAfterLine =
      bpmValue && bpmValue !== "-1" ? parseInt(bpmValue, 10) : null;

    return {
      type: "measureLine",
      isInPalmMuteSection: column[0] === "-",
      bpmAfterLine: isNaN(bpmAfterLine as number) ? null : bpmAfterLine,
      id: column[10] || crypto.randomUUID(),
    };
  }

  // Convert regular note
  const palmMuteValue = column[0] as "" | "-" | "start" | "end";
  const noteLengthModified = column[9] === "true";

  return {
    type: "note",
    palmMute: ["", "-", "start", "end"].includes(palmMuteValue)
      ? palmMuteValue
      : "",
    firstString: column[1] ?? "",
    secondString: column[2] ?? "",
    thirdString: column[3] ?? "",
    fourthString: column[4] ?? "",
    fifthString: column[5] ?? "",
    sixthString: column[6] ?? "",
    chordEffects: column[7] ?? "",
    noteLength: column[8] ?? "quarter",
    noteLengthModified,
    id: column[10] || crypto.randomUUID(),
  };
}

function convertTabSectionData(
  legacyData: string[][],
): (TabNote | TabMeasureLine)[] {
  return legacyData.map(convertLegacyColumnToTyped);
}

function migrateTabData(tabData: Section[]): {
  migrated: Section[];
  wasModified: boolean;
} {
  let wasModified = false;

  const migrated = tabData.map((section) => ({
    ...section,
    data: section.data.map((subSection) => {
      // Only process tab sections, not chord sections
      if (subSection.type !== "tab") {
        return subSection;
      }

      const tabSection = subSection as LegacyTabSection | NewTabSection;

      // Check if already in new format
      if (isNewFormat(tabSection.data)) {
        return tabSection;
      }

      // Check if in legacy format and needs conversion
      if (isLegacyFormat(tabSection.data)) {
        wasModified = true;
        return {
          ...tabSection,
          data: convertTabSectionData(tabSection.data as string[][]),
        } as NewTabSection;
      }

      // Unknown format, log warning and return as-is
      console.warn(
        `  ⚠️ Unknown data format in tab section ${tabSection.id}, skipping`,
      );
      return tabSection;
    }),
  }));

  return { migrated, wasModified };
}

async function main() {
  console.log("🚀 Starting tab data migration...\n");

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    // Fetch all tabs
    const tabs = await prisma.tab.findMany({
      select: {
        id: true,
        title: true,
        tabData: true,
      },
    });

    console.log(`📊 Found ${tabs.length} tabs to process\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const tab of tabs) {
      try {
        const tabData = tab.tabData as Section[];

        // Skip if tabData is not an array (invalid data)
        if (!Array.isArray(tabData)) {
          console.log(
            `⏭️  Tab ${tab.id} "${tab.title}": Invalid tabData format, skipping`,
          );
          skippedCount++;
          continue;
        }

        const { migrated, wasModified } = migrateTabData(tabData);

        if (!wasModified) {
          console.log(`✅ Tab ${tab.id} "${tab.title}": Already in new format`);
          skippedCount++;
          continue;
        }

        // Update the tab with migrated data
        await prisma.tab.update({
          where: { id: tab.id },
          data: { tabData: migrated },
        });

        console.log(`🔄 Tab ${tab.id} "${tab.title}": Migrated successfully`);
        migratedCount++;
      } catch (error) {
        console.error(
          `❌ Tab ${tab.id} "${tab.title}": Error during migration`,
        );
        console.error(error);
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📈 Migration Summary:");
    console.log(`   ✅ Migrated: ${migratedCount}`);
    console.log(
      `   ⏭️  Skipped (already migrated or invalid): ${skippedCount}`,
    );
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log("=".repeat(50));
  } catch (error) {
    console.error("Fatal error during migration:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
