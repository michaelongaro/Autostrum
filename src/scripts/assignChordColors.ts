/**
 * One-off migration script to assign colors to all chords in existing tabs.
 *
 * This script:
 * 1. Fetches all tabs from the database
 * 2. Parses the chords JSON field for each tab
 * 3. Assigns colors to chords that don't have one:
 *    - Uses getColorForChordName for major/minor chords (auto-assigned by root note)
 *    - Falls back to getNextChordColor for chords that don't match the pattern
 * 4. Updates the tab with the new chord data
 *
 * Run with: npm run tsx src/scripts/assignChordColors.ts
 */

import { PrismaClient } from "~/generated/client";
import { getColorForChordName, getNextChordColor } from "~/utils/chordColors";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
  log: ["error"],
});

interface Chord {
  id: string;
  name: string;
  color: string;
  frets: string[];
}

async function assignChordColors() {
  console.log("Starting chord color assignment migration...\n");

  try {
    // Fetch all tabs
    const tabs = await prisma.tab.findMany({
      select: {
        id: true,
        title: true,
        chords: true,
      },
    });

    console.log(`Found ${tabs.length} tabs to process.\n`);

    let tabsUpdated = 0;
    let totalChordsUpdated = 0;

    for (const tab of tabs) {
      try {
        // Parse chords JSON
        const chords = tab.chords as unknown as Chord[];

        if (!Array.isArray(chords) || chords.length === 0) {
          console.log(`Tab ${tab.id} (${tab.title}) has no chords, skipping.`);
          continue;
        }

        let hasChanges = false;
        let chordsUpdatedInTab = 0;

        // Create a new array with updated chords
        const updatedChords = chords.map((chord, index) => {
          // Check if chord already has a color
          if (chord.color && chord.color.trim() !== "") {
            return chord;
          }

          hasChanges = true;
          chordsUpdatedInTab++;

          // Try to get color based on chord name
          const autoColor = getColorForChordName(chord.name);

          if (autoColor) {
            console.log(
              `  Tab ${tab.id}: Assigning auto color ${autoColor} to chord "${chord.name}"`,
            );
            return {
              ...chord,
              color: autoColor,
            };
          }

          // Fallback to getNextChordColor (cycles through palette)
          // Pass previously processed chords to maintain consistent color distribution
          const fallbackColor = getNextChordColor(
            updatedChords.slice(0, index) as Chord[],
          );
          console.log(
            `  Tab ${tab.id}: Assigning fallback color ${fallbackColor} to chord "${chord.name}"`,
          );

          return {
            ...chord,
            color: fallbackColor,
          };
        });

        // Update the tab if there were changes
        if (hasChanges) {
          await prisma.tab.update({
            where: { id: tab.id },
            data: {
              chords: updatedChords as any,
            },
          });

          tabsUpdated++;
          totalChordsUpdated += chordsUpdatedInTab;
          console.log(
            `✓ Updated tab ${tab.id} (${tab.title}) - ${chordsUpdatedInTab} chord(s) updated\n`,
          );
        } else {
          console.log(
            `Tab ${tab.id} (${tab.title}) - all chords already have colors\n`,
          );
        }
      } catch (error) {
        console.error(`Error processing tab ${tab.id}:`, error);
        // Continue with next tab
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("Migration complete!");
    console.log(`Tabs updated: ${tabsUpdated} / ${tabs.length}`);
    console.log(`Total chords updated: ${totalChordsUpdated}`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("Fatal error during migration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
assignChordColors().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
