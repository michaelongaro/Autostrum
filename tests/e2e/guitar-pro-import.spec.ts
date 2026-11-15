import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { exporter, importer } from "@coderline/alphatab/core";

const fixtures = path.join(process.cwd(), "tests/fixtures/guitar-pro");

const headline = "Import a Guitar Pro tab";

function fileWithArtist(artist: string) {
  const score = importer.ScoreLoader.loadScoreFromBytes(
    new Uint8Array(readFileSync(path.join(fixtures, "guitarpro7-notes.gp"))),
  );
  score.artist = artist;
  return {
    name: "artist.gp",
    mimeType: "application/octet-stream",
    buffer: Buffer.from(new exporter.Gp7Exporter().export(score)),
  };
}

for (const width of [1440, 390, 320]) {
  test(`Guitar Pro import handles errors, drop, cancellation, replacement and undo at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/create");
    await page.locator("#title").fill("Existing draft");
    const previewBounds = await page
      .getByRole("button", { name: "Preview", exact: true })
      .boundingBox();
    const publishBounds = await page
      .getByRole("button", { name: "Publish", exact: true })
      .boundingBox();
    const importBounds = await page
      .getByRole("button", { name: "Import", exact: true })
      .boundingBox();
    expect(previewBounds && publishBounds && importBounds).toBeTruthy();
    expect(Math.abs(previewBounds!.y - publishBounds!.y)).toBeLessThan(1);
    if (width === 320) {
      expect(importBounds!.y).toBeGreaterThan(
        publishBounds!.y + publishBounds!.height,
      );
    } else {
      expect(Math.abs(importBounds!.y - previewBounds!.y)).toBeLessThan(1);
      expect(importBounds!.x + importBounds!.width).toBeLessThan(
        previewBounds!.x,
      );
    }
    const editorBounds = await page.locator("#mainTabComponent").boundingBox();
    expect(
      Math.abs(
        editorBounds!.x +
          editorBounds!.width -
          17 -
          publishBounds!.x -
          publishBounds!.width,
      ),
    ).toBeLessThan(2);
    if (width === 320) {
      expect(
        Math.abs(
          importBounds!.x +
            importBounds!.width -
            publishBounds!.x -
            publishBounds!.width,
        ),
      ).toBeLessThan(1);
    }
    await page.getByRole("button", { name: "Import", exact: true }).click();
    const dialog = page.getByRole("dialog", {
      name: headline,
    });
    if (width < 768)
      await expect(dialog).toHaveAttribute("data-slot", "drawer-content");
    else
      await expect(dialog).not.toHaveAttribute("data-slot", "drawer-content");
    await expect(
      dialog.getByText(
        "Files are read on your device. For older .gtp files, export to GP5 first.",
      ),
    ).toBeVisible();
    const fileInput = dialog.locator('input[type="file"]');
    await expect(
      dialog.getByText(
        "Bring an existing track into the editor. Supports Guitar Pro 3–8.",
      ),
    ).toHaveCount(0);
    await fileInput.setInputFiles({
      name: "broken.gp5",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("not a tab"),
    });
    await expect(dialog.getByRole("alert")).toContainText("could not be read");
    await expect(
      dialog.getByRole("button", { name: "Replace draft & import" }),
    ).toBeDisabled();
    await expect(page.locator("#title")).toHaveValue("Existing draft");

    // Exercise the actual drop handler and bundled worker, without uploading files.
    const bytes = [
      ...readFileSync(path.join(fixtures, "guitarpro8-beat-tempo-change.gp")),
    ];
    const transfer = await page.evaluateHandle((data) => {
      const transfer = new DataTransfer();
      transfer.items.add(
        new File([new Uint8Array(data)], "tempo.gp", {
          type: "application/octet-stream",
        }),
      );
      return transfer;
    }, bytes);
    await dialog.dispatchEvent("drop", { dataTransfer: transfer });
    await transfer.dispose();
    await expect(dialog.getByText(/4 measures/)).toBeVisible();
    await dialog.getByText(/Review import adjustments/).click();
    await expect(
      dialog.getByText(/Tempo changes inside measures/),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.locator("#title")).toHaveValue("Existing draft");

    await page.getByRole("button", { name: "Import", exact: true }).click();
    await fileInput.setInputFiles(path.join(fixtures, "guitarpro7-notes.gp"));
    await expect(
      dialog.getByRole("button", { name: "Replace draft & import" }),
    ).toBeEnabled();
    await dialog
      .getByRole("button", { name: "Replace draft & import" })
      .click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator("#title")).not.toHaveValue("Existing draft");
    await expect(
      page.locator('input[id$="-6"]').filter({ visible: true }).first(),
    ).toHaveValue("1");
    await expect(
      page.locator('input[id$="-1"]').filter({ visible: true }).first(),
    ).toHaveValue("");
    // The history shortcut ignores focused text fields, so focus the document first.
    await page.locator("#title").blur();
    await page.keyboard.press("Control+z");
    await expect(page.locator("#title")).toHaveValue("Existing draft");
  });
}

test("import selects a matching artist or fills a new artist entry", async ({
  page,
}) => {
  await page.goto("/create");
  const lookups: string[] = [];
  await page.route(
    (url) => url.pathname.includes("artist.getByNameAndOrId"),
    async (route) => {
      const input = JSON.parse(
        new URL(route.request().url()).searchParams.get("input")!,
      ) as Record<string, { json: { name: string } }>;
      const name = input["0"]!.json.name;
      lookups.push(name);
      const artist =
        name.toLowerCase() === "papa roach"
          ? { id: 12345, name: "Papa Roach", isVerified: true }
          : null;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([{ result: { data: { json: artist } } }]),
      });
    },
  );
  for (const [source, selected] of [
    ["  pApA rOaCh  ", "Papa Roach"],
    ["A New Imported Artist", "A New Imported Artist"],
  ]) {
    await page.getByRole("button", { name: "Import", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: headline });
    await dialog
      .locator('input[type="file"]')
      .setInputFiles(fileWithArtist(source!));
    const importButton = dialog.getByRole("button", {
      name: /^(Import track|Replace draft & import)$/,
    });
    await expect(importButton).toBeEnabled();
    await importButton.click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator("#artistCombobox")).toContainText(selected!);
  }
  expect(lookups).toEqual(["pApA rOaCh", "A New Imported Artist"]);
});
