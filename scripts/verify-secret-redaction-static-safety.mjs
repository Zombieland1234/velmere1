import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const errors = [];

const excludedDirs = new Set(["node_modules", ".next", ".git", "dist", "out", ".npm-cache"]);
const excludedFiles = new Set(["scripts/verify-secret-redaction-static-safety.mjs"]);
const syntheticRawAssignmentFixtures = new Map([
  ["scripts/pass36/test-a95-staging-subject-admission.mjs", new Set(["STRIPE_SECRET_KEY="])],
]);

function containsRawAssignmentMarker(source, marker) {
  let offset = 0;
  while (offset < source.length) {
    const index = source.indexOf(marker, offset);
    if (index === -1) return false;
    const precedingCharacter = index === 0 ? "" : source[index - 1];
    if (!/[A-Za-z0-9_]/u.test(precedingCharacter)) return true;
    offset = index + marker.length;
  }
  return false;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (excludedDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).split(path.sep).join("/");
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

const clientFiles = walk(root).filter((file) => (
  !file.startsWith("app/api/")
  && (file.endsWith(".tsx") || file.includes("components/") || file.startsWith("app/"))
));
for (const file of clientFiles) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  for (const marker of browserPrivateMarkers) {
    if (source.includes(marker)) errors.push(`${file}: private server env marker must not be used in browser-visible code: ${marker}`);
  }
}

for (const file of walk(root)) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  for (const marker of privateEnvMarkers) {
    const permittedSyntheticMarkers = syntheticRawAssignmentFixtures.get(file);
    if (containsRawAssignmentMarker(source, marker) && !permittedSyntheticMarkers?.has(marker)) {
      errors.push(`${file}: looks like a raw secret assignment marker: ${marker}`);
    }
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
