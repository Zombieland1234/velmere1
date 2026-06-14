import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const json = (file) => JSON.parse(read(file));
const checks = [];
function check(name, ok, hint) {
  checks.push({ name, ok: Boolean(ok), hint });
}

const pkg = json("package.json");
const preflight = read("scripts/vercel-preflight.mjs");
const neuralAudit = read("components/market-integrity/VlmNeuralAuditExperience.tsx");
const cart = read("components/CartDrawer.tsx");
const square = read("components/square/VelmereSquareClient.tsx");
const staticSmoke = read("scripts/smoke-routes-static.mjs");

check(
  "Vercel preflight accepts unified asset modal replacement instead of legacy hidden review panels",
  preflight.includes("unifiedAssetModal") && preflight.includes("unified asset modal replacement"),
  "Legacy markers must not force hidden/public-chaos panels back into Shield.",
);
check(
  "Vercel preflight accepts unified evidence details replacement",
  preflight.includes("unifiedEvidenceDetails") && preflight.includes("unified evidence details replacement"),
  "Evidence manifests may exist as source/gap/details state without re-adding public export panels.",
);
check(
  "Vercel preflight accepts unified source-state details replacement",
  preflight.includes("unifiedSourceSpineReplacement") && preflight.includes("source-state details replacement"),
  "Source spine guard must track the new source-state details row.",
);
check(
  "Vercel preflight accepts unified depth dock as VLM trigger",
  preflight.includes("unifiedDepthDockRunsBrain") && preflight.includes("onSelect={runVlmAiSequence}"),
  "The Basic/Pro/Advanced dock must be the VLM Brain trigger.",
);
check(
  "Market guard accepts unified chart modal replacement",
  preflight.includes("unifiedChartModal") && preflight.includes("PopupMarketChart"),
  "Chart guard must follow the shared modal architecture.",
);
check(
  "Static route smoke script exists and is wired",
  pkg.scripts?.["smoke:routes:static"] === "node scripts/smoke-routes-static.mjs" && staticSmoke.includes("static route smoke ok"),
  "Static route QA should run without a dev server.",
);
check(
  "VLM neural audit uses shared dialog focus boundary",
  neuralAudit.includes("useDialogFocusBoundary") && neuralAudit.includes("initialFocus: closeButtonRef"),
  "The full-screen neural audit must use the same React 19 focus return trap as other dialogs.",
);
check(
  "VLM neural audit removed legacy openerRef manual focus cleanup",
  !neuralAudit.includes("openerRef") && !neuralAudit.includes("resolvePass605FocusTrap"),
  "Manual focus cleanup was fragile under React 19 remounts.",
);
check(
  "Cart quantity buttons use localized labels",
  cart.includes('aria-label={t("decreaseQuantity")}') && cart.includes('aria-label={t("increaseQuantity")}'),
  "Cart controls cannot hardcode English aria labels.",
);
for (const locale of ["en", "pl", "de"]) {
  const messages = json(`messages/${locale}.json`);
  check(
    `${locale} cart quantity aria copy exists`,
    Boolean(messages.Cart?.decreaseQuantity && messages.Cart?.increaseQuantity),
    "Cart aria labels must be localized in every language.",
  );
}
check(
  "Square post modal is header-safe and scroll-region aware",
  square.includes("velmere-header-safe-modal") && square.includes("max-w-[82rem]") && square.includes('data-mobile-safe-close="true"') && square.includes('data-modal-scroll-region="true"'),
  "Square post modal must stay scrollable and closable on mobile.",
);

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`PASS954-973 verifier failed (${failed.length}/${checks.length})`);
  for (const item of failed) console.error(`- ${item.name}: ${item.hint}`);
  process.exit(1);
}
console.log(`PASS954-973 verifier passed (${checks.length}/${checks.length})`);
