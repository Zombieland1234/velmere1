import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const checks = [];
const failures = [];

function read(file) {
  return readFileSync(path.join(root, file), "utf8");
}
function check(name, pass, detail = "") {
  checks.push({ name, pass, detail });
  if (!pass) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}
function has(file, needle) {
  return read(file).includes(needle);
}

const pkg = JSON.parse(read("package.json"));
const search = read("components/search/VelmereIntelligenceSearchClient.tsx");
const dialogHook = read("components/ui/useDialogFocusBoundary.ts");
const scrollHook = read("components/ui/useModalScrollLock.ts");
const brain = read("components/market-integrity/VlmBrainWorkspace.tsx");
const css = read("app/globals.css");
const envDoctor = read("scripts/check-runtime-env.mjs");
const log = existsSync(path.join(root, "PASS904_933_NODE24_NPM11_DRY_RUN.log"))
  ? read("PASS904_933_NODE24_NPM11_DRY_RUN.log")
  : "";

check("Node 24 / npm 11 dry run recorded", log.includes("v24.16.0") && log.includes("11.16.0") && log.includes("status=0"));
check("runtime doctor detects npm from PATH", envDoctor.includes("execFileSync") && envDoctor.includes("detectNpmVersion"));
check("npm 11 dry run has no ERESOLVE", log && !/ERESOLVE|peer dep missing|unable to resolve dependency tree/i.test(log));
check("package has Node 24 helper script", pkg.scripts?.["ci:node24-npm11-dry-run"]?.includes("node@24.16.0"));
check("package has React/Web3 overrides", Boolean(pkg.overrides?.react && pkg.overrides?.wagmi && pkg.overrides?.viem));
check("package has React/Web3 resolutions", Boolean(pkg.resolutions?.react && pkg.resolutions?.wagmi && pkg.resolutions?.viem));
check("dialog hook uses layout effect", dialogHook.includes("useLayoutEffect"));
check("dialog hook captures focus snapshot", dialogHook.includes("captureFocusSnapshot"));
check("dialog hook tracks focus before open", dialogHook.includes("latestFocusSnapshotRef") && dialogHook.includes("focusin"));
check("dialog hook restores by MutationObserver", dialogHook.includes("new MutationObserver"));
check("dialog hook handles Escape", dialogHook.includes('event.key === "Escape"'));
check("dialog hook supports outside pointer close", dialogHook.includes("closeOnOutsidePointerDown"));
check("scroll hook uses iOS touch boundary math", scrollHook.includes("previousTouchY") && scrollHook.includes("normalizeIOSScrollBoundary"));
check("scroll hook blocks wheel leakage", scrollHook.includes("closestGestureOwner") && scrollHook.includes("event.preventDefault()"));
check("Lens imports dialog focus boundary", search.includes("useDialogFocusBoundary"));
check("Lens depth dialog uses focus boundary", search.includes("choiceDialogRef") && search.includes("choiceCloseRef"));
check("Lens forge dialog uses shared boundary", search.includes("Boolean(pdfLoadingId), forgeDialogRef"));
check("Lens preview dialog uses shared boundary", search.includes("Boolean(pdfPreview), previewDialogRef"));
check("Lens toolbar arrow QA preserved", search.includes("handlePreviewToolbarKeyDown") && search.includes("ArrowLeft") && search.includes("ArrowRight"));
check("Lens toolbar Escape closes preview", search.includes('event.key === "Escape"') && search.includes("closePreview();"));
check("VLM brain has tiered phases", brain.includes('type LoadingPhase = "idle" | "boot" | "orb" | "brain"') && brain.includes("PHASE_MINIMUM_MS"));
check("VLM brain has depth minimums", brain.includes("DEPTH_MINIMUM_MS") && brain.includes("advanced: 7200"));
check("VLM brain confidence penalty exists", brain.includes("applyClientConfidencePenalty") && brain.includes("originalConfidence * 0.75"));
check("VLM brain fallback cap below 40", brain.includes("Math.min(39, penalizedConfidence)"));
check("VLM brain UI exposes penalty", brain.includes("data-confidence-penalty") && brain.includes("Fallback Data"));
check("print hides Lens toolbar", css.includes("@media print") && css.includes("data-pass470-keyboard-toolbar"));

for (const locale of ["en", "pl", "de"]) {
  const source = read(`messages/${locale}.json`);
  check(`${locale} i18n has no forbidden investment copy`, !/\b(profit|roi|guarantee|guaranteed|yield|dividend|gains?\b)\b/i.test(source));
  check(`${locale} wallet copy mentions seed phrase`, source.toLowerCase().includes("seed phrase"));
}

if (failures.length) {
  console.error("PASS904-933 verifier failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`PASS904-933 verifier passed (${checks.length}/${checks.length})`);
