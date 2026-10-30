import { defineConfig } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  workers: 1,
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: "file:data/e2e.db",
      ADMIN_EMAILS: "admin@e2e.test",
      AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e!",
      SMTP_USER: "",
      SMTP_PASS: "",
    },
  },
});
