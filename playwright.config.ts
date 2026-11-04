import { defineConfig, devices } from "@playwright/test";

const PORT = 3101;

export default defineConfig({
  testDir: "e2e",
  outputDir: "e2e-results",
  globalSetup: "./e2e/global-setup.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 8_000 },
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } },
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/me`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: { STORE_BACKEND: "local", DATA_DIR: ".data-test", SESSION_SECRET: "e2e-secret", NODE_ENV: "production" },
  },
});
