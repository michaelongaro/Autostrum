import nextEnv from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Load the same local environment files as Next.js; CI provides these directly.
nextEnv.loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 1000 },
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    // Artifacts can include authenticated requests; keep them local.
    trace: "off",
    screenshot: "only-on-failure",
  },
});
