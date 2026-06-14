import { readFileSync, existsSync } from "node:fs";

const failures = [];
const required = [
  "components/launch/FullSurfaceReadinessIndex.tsx",
  "VELMERE_PASS165_BIG_SURFACE_READINESS_REPORT.md",
  "VELMERE_PASS165_FULL_PROGRESS_MATRIX.md",
  "app/[locale]/vlm-token/page.tsx",
  "app/[locale]/square/page.tsx",
  "app/[locale]/research-lab/page.tsx",
  "app/[locale]/checkout/page.tsx",
  "components/home/HomePageClient.tsx",
];

for (const file of required) {
  if (!existsSync(file)) failures.push(`${file} is missing`);
}

const component = readFileSync("components/launch/FullSurfaceReadinessIndex.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
const matrix = readFileSync("VELMERE_PASS165_FULL_PROGRESS_MATRIX.md", "utf8");

for (const token of [
  "FullSurfaceReadinessIndex",
  "surfaceWeight",
  "Mobile QA",
  "Data spine",
  "Operator gate",
  "Commerce truth",
]) {
  if (!component.includes(token)) failures.push(`Component missing token: ${token}`);
}

for (const token of ["fsri-shell", "fsri-card", "fsri-status-ready", "fsri-status-blocked"]) {
  if (!css.includes(token)) failures.push(`CSS missing token: ${token}`);
}

for (const file of [
  "app/[locale]/vlm-token/page.tsx",
  "app/[locale]/square/page.tsx",
  "app/[locale]/research-lab/page.tsx",
  "app/[locale]/checkout/page.tsx",
  "components/home/HomePageClient.tsx",
]) {
  const source = readFileSync(file, "utf8");
  if (!source.includes("FullSurfaceReadinessIndex")) failures.push(`${file} does not render readiness index`);
}

for (const area of [
  "Home / brand landing",
  "VLM token page",
  "Velmère Square",
  "Research Lab / prime crypto story",
  "Commerce/order/payment readiness",
  "Analytics / telemetry readiness",
]) {
  if (!matrix.includes(area)) failures.push(`Progress matrix missing area: ${area}`);
}

if (failures.length) {
  console.error("PASS165 surface readiness safety failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS165 surface readiness safety OK");
