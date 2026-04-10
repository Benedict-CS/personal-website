import { defineConfig, devices } from "@playwright/test";

const isCi = process.env.CI === "true";
/** Dedicated listen port in CI so `next start` never fights another process on :3000. */
const ciListenPort = process.env.PLAYWRIGHT_E2E_PORT ?? "3041";
const resolvedBaseURL = process.env.PLAYWRIGHT_BASE_URL
  ? process.env.PLAYWRIGHT_BASE_URL
  : isCi
    ? `http://127.0.0.1:${ciListenPort}`
    : "http://localhost:3000";

const origin = resolvedBaseURL.replace(/\/$/, "");
/** DB-free probe so `webServer` becomes ready even when pages SSR hits Prisma errors. */
const webServerReadyURL = `${origin}/api/live`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: resolvedBaseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: isCi
    ? {
        // When CI already ran `npm run verify`, set PLAYWRIGHT_SKIP_BUILD=1 to run only `next start`.
        command:
          process.env.PLAYWRIGHT_SKIP_BUILD === "1"
            ? `PORT=${ciListenPort} node .next/standalone/server.js`
            : `npm run build && PORT=${ciListenPort} node .next/standalone/server.js`,
        url: webServerReadyURL,
        reuseExistingServer: false,
      }
    : undefined,
});
