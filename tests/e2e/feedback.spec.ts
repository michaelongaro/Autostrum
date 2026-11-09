import { expect, test } from "@playwright/test";

for (const mobile of [false, true]) {
  test.describe(mobile ? "touch with reduced motion" : "desktop", () => {
    test.use({
      hasTouch: mobile,
      isMobile: mobile,
      reducedMotion: mobile ? "reduce" : "no-preference",
    });
    test(`feedback handles failure and success on ${mobile ? "mobile" : "desktop"}`, async ({
      page,
    }) => {
      await page.setViewportSize(
        mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      );

      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      let attempts = 0;
      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      // Intercept writes so the shared database never receives test feedback.
      await page.route("**/api/trpc/feedback.create?*", async (route) => {
        attempts++;
        const body = route.request().postDataJSON() as Record<
          string,
          { json: unknown }
        >;
        expect(body["0"]?.json).toEqual({
          category: "BUG",
          message: "The player stopped.",
        });
        if (attempts === 1) {
          await route.fulfill({
            status: 500,
            json: [
              {
                error: {
                  json: {
                    message: "Test failure",
                    code: -32603,
                    data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
                  },
                },
              },
            ],
          });
        } else {
          await pending;
          await route.fulfill({
            json: [{ result: { data: { json: { success: true } } } }],
          });
        }
      });

      try {
        await page.goto("/privacy");
        const trigger = page
          .locator("footer")
          .getByRole("button", { name: "Feedback", exact: true });
        await expect(
          page
            .locator("footer")
            .getByRole("link", { name: "Contact", exact: true }),
        ).toHaveCount(0);
        await trigger.click();
        const dialog = page.getByRole("dialog", {
          name: "Share your feedback",
        });
        await expect(dialog).toBeVisible();
        expect(
          (await dialog.getAttribute("data-slot")) === "drawer-content",
        ).toBe(mobile);

        const message = dialog.getByLabel("Content", { exact: true });
        const submit = dialog.locator('button[type="submit"]');
        // Measure layout independently of the dialog's opening scale animation.
        const submitWidth = await submit.evaluate(
          (element: HTMLButtonElement) => element.offsetWidth,
        );
        const cancel = dialog.getByRole("button", {
          name: "Cancel",
          exact: true,
        });
        const cancelX = await cancel.evaluate(
          (element: HTMLButtonElement) => element.offsetLeft,
        );
        await expect(submit).toBeDisabled();
        await message.fill("   ");
        await expect(submit).toBeDisabled();
        await expect(message).toHaveAttribute("maxlength", "5000");
        const types = dialog.getByRole("group", { name: "Type", exact: true });
        await types.getByRole("button", { name: "Other", exact: true }).click();
        await expect(
          types.getByRole("button", { name: "Other", exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
        await types.getByRole("button", { name: "Bug", exact: true }).click();
        await message.fill("  The player stopped.  ");
        await dialog
          .getByRole("button", { name: "Cancel", exact: true })
          .click();
        await expect(dialog).toBeHidden();
        await trigger.click();
        await expect(message).toHaveValue("  The player stopped.  ");
        await submit.click();
        await expect(dialog.getByRole("alert")).toContainText(
          "Please try again later",
        );
        expect(
          await submit.evaluate(
            (element: HTMLButtonElement) => element.offsetWidth,
          ),
        ).toBe(submitWidth);
        expect(
          await cancel.evaluate(
            (element: HTMLButtonElement) => element.offsetLeft,
          ),
        ).toBe(cancelX);
        await expect(message).toHaveValue("  The player stopped.  ");
        await expect(
          dialog.getByText("Thank you for your feedback", { exact: true }),
        ).toHaveCount(0);

        await submit.click();
        await expect(
          dialog.getByRole("button", { name: "Sending…", exact: true }),
        ).toBeDisabled();
        await expect(message).toBeDisabled();
        await expect(submit.locator('svg[aria-label="loading"]')).toBeVisible();
        expect(
          await submit.evaluate(
            (element: HTMLButtonElement) => element.offsetWidth,
          ),
        ).toBe(submitWidth);
        expect(
          await cancel.evaluate(
            (element: HTMLButtonElement) => element.offsetLeft,
          ),
        ).toBe(cancelX);
        await expect(dialog.getByRole("alert")).toHaveCount(0);
        await page.keyboard.press("Escape");
        await expect(dialog).toBeVisible();
        release();
        await expect(dialog.getByRole("status")).toContainText(
          "Thank you for your feedback",
        );
        await expect(
          dialog.getByRole("heading", { name: "Thank you for your feedback" }),
        ).toBeFocused();
        await dialog.getByRole("button", { name: "Done", exact: true }).click();
        await expect(dialog).toBeHidden();
        await expect(trigger).toBeFocused();
        await trigger.click();
        await expect(message).toHaveValue("");
        await expect(
          types.getByRole("button", { name: "Feature request", exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
        await dialog
          .getByRole("button", { name: "Cancel", exact: true })
          .click();
        expect(attempts).toBe(2);
        expect(errors).toEqual([]);
      } finally {
        release();
        await page.unrouteAll({ behavior: "wait" });
      }
    });
  });
}
