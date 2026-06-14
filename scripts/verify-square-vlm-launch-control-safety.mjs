import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

for (const file of [
  "lib/launch/square-vlm-launch-control.ts",
  "components/launch/SquareVlmLaunchControl.tsx",
  "app/[locale]/square/page.tsx",
  "app/[locale]/vlm-token/page.tsx",
  "app/[locale]/community/page.tsx",
]) {
  if (!exists(file)) errors.push(`${file}: missing Square/VLM launch control file or route integration.`);
}

const model = read("lib/launch/square-vlm-launch-control.ts");
const component = read("components/launch/SquareVlmLaunchControl.tsx");
const squarePage = read("app/[locale]/square/page.tsx");
const vlmPage = read("app/[locale]/vlm-token/page.tsx");
const communityPage = read("app/[locale]/community/page.tsx");
const projectProgress = read("lib/launch/project-progress.ts");
const siteAudit = read("lib/launch/site-page-audit.ts");
const pl = JSON.parse(read("messages/pl.json"));
const de = JSON.parse(read("messages/de.json"));

for (const needle of [
  "squareVlmLaunchControl",
  "getSquareVlmLaunchControlSummary",
  "No ROI, no price promise, no public sale claim, no custody and no seed phrase flow.",
  "member-cockpit",
  "moderation flow",
  "wallet safety proof",
]) {
  if (!model.includes(needle)) errors.push(`square-vlm-launch-control.ts missing marker: ${needle}`);
}

for (const needle of [
  "SquareVlmLaunchControl",
  "surface: \"square\" | \"vlm\" | \"community\"",
  "VLM remains a utility/access layer",
  "VLM pozostaje utility/access layer",
  "VLM bleibt eine Utility-/Access-Ebene",
  "safety boundary",
]) {
  if (!component.includes(needle)) errors.push(`SquareVlmLaunchControl.tsx missing marker: ${needle}`);
}

if (!squarePage.includes("<SquareVlmLaunchControl locale={locale} surface=\"square\" />")) {
  errors.push("Square page must render SquareVlmLaunchControl with surface=square.");
}
if (!vlmPage.includes("<SquareVlmLaunchControl locale={locale} surface=\"vlm\" />")) {
  errors.push("VLM token page must render SquareVlmLaunchControl with surface=vlm.");
}
if (!communityPage.includes("<SquareVlmLaunchControl locale={locale} surface=\"community\" />")) {
  errors.push("Community page must render SquareVlmLaunchControl with surface=community.");
}

if (!projectProgress.includes('progress: 57') || !projectProgress.includes('progress: 48')) {
  errors.push("project-progress.ts must include updated VLM/Square progress after launch control.");
}
if (!siteAudit.includes('status: "launch_control"') || !siteAudit.includes("Square")) {
  errors.push("site-page-audit.ts must include launch-control state for VLM/Square pages.");
}

if (pl.Footer.riskMicro !== "VLM jest warstwą dostępu, nie inwestycją.") {
  errors.push("messages/pl.json Footer.riskMicro is not localized.");
}
if (de.Footer.riskMicro !== "VLM ist eine Access-Ebene, keine Investition.") {
  errors.push("messages/de.json Footer.riskMicro is not localized.");
}
if (pl.Footer.newsletterOffline.includes("Join the waitlist") || de.Footer.newsletterOffline.includes("Join the waitlist")) {
  errors.push("Footer newsletterOffline still contains English in PL/DE locales.");
}

for (const forbidden of [
  "guaranteed profit",
  "price will",
  "ROI promise",
  "risk-free",
  "public sale is live",
  "enter seed phrase",
]) {
  const haystack = `${model}\n${component}\n${vlmPage}\n${squarePage}`.toLowerCase();
  if (haystack.includes(forbidden.toLowerCase())) {
    errors.push(`Square/VLM launch control contains forbidden wording: ${forbidden}`);
  }
}

if (errors.length) {
  console.error("Square/VLM launch control safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Square/VLM launch control safety checks passed.");
