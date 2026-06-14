import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT || 4173);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${port}`;
const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: "./tests/e2e",
  globalTimeout: 12 * 60_000,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: process.env.PLAYWRIGHT_RECORD_VIDEO === "1" ? "retain-on-failure" : "off",
    locale: "pl-PL",
    timezoneId: "Europe/Berlin",
    launchOptions: chromiumExecutablePath
      ? { executablePath: chromiumExecutablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] }
      : undefined,
  },
  projects: [
    { name: "pixel-7", use: { ...devices["Pixel 7"], colorScheme: "dark" } },
    {
      name: "iphone-13",
      use: { ...devices["iPhone 13"], colorScheme: "dark" },
    },
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 300_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
