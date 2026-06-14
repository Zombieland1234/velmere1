import fs from "node:fs";
import net from "node:net";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";

function reserveFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

const browserExecutable = chromium.executablePath();
if (!browserExecutable || !fs.existsSync(browserExecutable)) {
  console.error(
    `PASS550 browser environment gate failed: Chromium is not installed at ${browserExecutable || "<unknown>"}. Run: npx playwright install chromium`,
  );
  process.exit(2);
}

const port = await reserveFreePort();
if (!port) throw new Error("PASS543 could not reserve a local Playwright port");

const cli = path.resolve("node_modules/@playwright/test/cli.js");
const forwarded = process.argv.slice(2);
const args = [
  cli,
  "test",
  "tests/e2e/pass536-mobile-gesture-viewports.spec.ts",
  "--project=pixel-7",
  "--project=iphone-13",
  "--reporter=line",
  ...forwarded,
];

console.log(`PASS543 mobile E2E lease · http://127.0.0.1:${port}`);
const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    PLAYWRIGHT_PORT: String(port),
    VELMERE_PLAYWRIGHT_LEASE: "pass543",
  },
});

const forwardSignal = (signal) => {
  if (!child.killed) child.kill(signal);
};
process.once("SIGINT", () => forwardSignal("SIGINT"));
process.once("SIGTERM", () => forwardSignal("SIGTERM"));

child.once("error", (error) => {
  console.error("PASS543 mobile E2E runner failed", error);
  process.exitCode = 1;
});
child.once("exit", (code, signal) => {
  if (signal) console.error(`PASS543 Playwright exited by ${signal}`);
  process.exitCode = code ?? 1;
});
