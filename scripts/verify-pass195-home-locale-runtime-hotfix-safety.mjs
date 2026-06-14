import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const home = read("components/home/HomePageClient.tsx");
const preflight = read("scripts/vercel-preflight.mjs");

if (!home.includes('import { useLocale } from "next-intl";') && !home.includes("import { useLocale } from 'next-intl';")) {
  errors.push("HomePageClient.tsx must import useLocale from next-intl.");
}
if (!/export\s+default\s+function\s+HomePageClient\s*\(\)\s*\{\s*const\s+locale\s*=\s*useLocale\(\)\s*;/s.test(home)) {
  errors.push("HomePageClient.tsx must define const locale = useLocale(); inside HomePageClient before JSX.");
}
if (!home.includes('<FullSurfaceReadinessIndex locale={locale} surface="home" />')) {
  errors.push("HomePageClient.tsx must pass locale into FullSurfaceReadinessIndex.");
}
if (home.includes("window.") || home.includes("document.")) {
  errors.push("HomePageClient.tsx should not gain window/document access for this hotfix.");
}
for (const token of ["verify-pass195-home-locale-runtime-hotfix-safety.mjs", "PASS195"]) {
  if (!preflight.includes(token)) errors.push(`vercel-preflight.mjs missing PASS195 marker: ${token}`);
}

if (errors.length) {
  console.error("PASS195 home locale runtime hotfix safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS195 home locale runtime hotfix safety OK");
