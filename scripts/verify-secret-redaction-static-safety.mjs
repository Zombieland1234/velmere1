import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

const excludedDirs = new Set(["node_modules", ".next", ".git", "dist", "out", ".npm-cache"]);
const excludedFiles = new Set(["scripts/verify-secret-redaction-static-safety.mjs"]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (excludedDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs|json)$/.test(entry.name) && !excludedFiles.has(rel)) files.push(rel);
  }
  return files;
}

const privateEnvMarkers = [
  "PRINTFUL_TOKEN=",
  "PRINTFUL_API_KEY=",
  "STRIPE_SECRET_KEY=",
  "WEBHOOK_SECRET=",
  "ADMIN_SESSION_SECRET=",
  "DATABASE_URL=",
  "PRIVATE_KEY=",
  "OPENAI_API_KEY=",
];

const browserPrivateMarkers = [
  "process.env.PRINTFUL_TOKEN",
  "process.env.PRINTFUL_API_KEY",
  "process.env.STRIPE_SECRET_KEY",
  "process.env.WEBHOOK_SECRET",
  "process.env.ADMIN_SESSION_SECRET",
  "process.env.DATABASE_URL",
  "process.env.PRIVATE_KEY",
  "process.env.OPENAI_API_KEY",
];

const clientFiles = walk(root).filter((file) => file.endsWith(".tsx") || file.includes("components/") || file.includes("app/"));
for (const file of clientFiles) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  for (const marker of browserPrivateMarkers) {
    if (source.includes(marker)) errors.push(`${file}: private server env marker must not be used in browser-visible code: ${marker}`);
  }
}

for (const file of walk(root)) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  for (const marker of privateEnvMarkers) {
    if (source.includes(marker)) errors.push(`${file}: looks like a raw secret assignment marker: ${marker}`);
  }
}

const policy = fs.readFileSync(path.join(root, "lib/launch/secret-redaction-policy.ts"), "utf8");
if (!policy.includes("Browser-visible secret scan") || !policy.includes("Raw provider response redaction")) {
  errors.push("secret redaction policy must include browser scan and raw provider redaction markers.");
}

if (errors.length) {
  console.error("Secret redaction static safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Secret redaction static safety checks passed across ${walk(root).length} files.`);
