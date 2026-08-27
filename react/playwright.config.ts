import { defineConfig, devices } from "@playwright/test";

// Port the suite runs against. Override to keep a run off a dev server that is
// already using 3000.
const E2E_PORT = process.env.E2E_PORT ?? "3000";

// Build the app and serve the static bundle, rather than running the CRA dev
// server. CI always does this; locally it is opt-in via E2E_SERVE_BUILD.
const SERVE_BUILD = Boolean(process.env.CI || process.env.E2E_SERVE_BUILD);

// Playwright config for the CRA app
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${E2E_PORT}`,
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: [
    {
      // In CI: build once and serve the static bundle. The CRA dev server's
      // webpack-dev-server-client overlay iframe intercepts clicks on the
      // GitHub Actions runners (HMR websocket can't connect), so e2e times
      // out. The production build has no dev-server overlay.
      // Locally: keep `npm start` for fast HMR-friendly development.
      command: SERVE_BUILD
        ? `npm run build-react && npx --no-install serve -s build -l ${E2E_PORT}`
        : "npm start",
      url: `http://localhost:${E2E_PORT}`,
      // Never reuse an existing server on the build-and-serve path: a dev server
      // already on this port would not have REACT_APP_EXPOSE_STORE set, and the
      // specs that drive Redux would fail for that reason alone.
      reuseExistingServer: !SERVE_BUILD,
      timeout: 180_000,
      // Pipe webServer output so build/serve failures are visible in CI logs
      // instead of hiding behind a generic "Process ... exit code 1" message.
      stdout: "pipe",
      stderr: "pipe",
      env: {
        BROWSER: "none",
        PORT: E2E_PORT,
        // Compile-time flag read by store.js to expose window.__STORE__ on the
        // production bundle that CI serves. Tests rely on this to drive Redux.
        REACT_APP_EXPOSE_STORE: "true",
      },
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
