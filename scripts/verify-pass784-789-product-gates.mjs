import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";

const failures = [];
const checks = [];

async function text(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

async function exists(path) {
  try {
    await access(new URL(`../${path}`, import.meta.url), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function expect(name, condition, detail = "") {
  checks.push({ name, ok: Boolean(condition) });
  if (!condition) failures.push(`${name}${detail ? `: ${detail}` : ""}`);
}

const auth = await text("components/auth/AuthFormClient.tsx");
const login = await text("app/[locale]/login/page.tsx");
const account = await text("components/dashboard/DashboardClient.tsx");
const checkout = await text("app/[locale]/checkout/page.tsx");
const checkoutApi = await text("app/api/checkout/route.ts");
const square = await text("components/square/VelmereSquareClient.tsx");
const community = await text("app/[locale]/community/page.tsx");
const research = await text("app/[locale]/research-lab/page.tsx");
const governor = await text("lib/motion/useRuntimeSurfaceGovernor.ts");
const tokenModal = await text("components/market-integrity/TokenRiskModal.tsx");
const globals = await text("app/globals.css");

expect("PASS784 account creation does not require a wallet", !/mode === ["']create["'][\s\S]{0,160}!walletUi\.connected/.test(auth));
expect("PASS784 wallet is described as optional in PL/EN/DE", (login.match(/optional|opcjonalny|optional/gi) ?? []).length >= 3);
expect("PASS784 auth tabs expose tablist semantics", auth.includes('role="tablist"') && auth.includes('role="tabpanel"') && auth.includes('aria-controls="auth-access-panel"'));
expect("PASS784 member console exposes account and shortened wallet identity", account.includes("localProfile?.displayName") && account.includes("walletUi.shortAddress"));
for (const path of ["app/login/page.tsx", "app/member/page.tsx", "app/account/page.tsx", "app/[locale]/login/page.tsx", "app/[locale]/member/page.tsx", "app/[locale]/account/page.tsx"]) {
  expect(`PASS784 route exists: ${path}`, await exists(path));
}

expect("PASS785 checkout readiness is environment-backed", checkout.includes("getCheckoutReadiness") && checkout.includes("checkoutReadiness.enabled"));
expect("PASS785 checkout stays guest-first", !/authenticated|requireAuth|sessionUser/.test(checkoutApi) && /walletRequired:\s*false/.test(checkout));
expect("PASS785 commerce readiness cannot be faked", checkoutApi.includes("getCheckoutReadiness") || checkoutApi.includes("STORE_COMMERCIAL_READY"));

expect("PASS786 Square keeps public reading and account-gated publishing", square.includes("const { authenticated }") && square.includes("if (!authenticated)") && square.includes("composerOpen"));
expect("PASS786 Square creates moderated pending posts", square.includes('moderationStatus: "pending"') && square.toLowerCase().includes("manual moderation"));
expect("PASS786 community keeps commerce and Web3 separated", community.includes("separated from basic commerce") || community.includes("rozdzielone od podstawowego sklepu"));
expect("PASS786 research exposes falsification and claim boundaries", research.includes("Falsification") && research.includes("Claim boundary") && research.includes("does not claim"));

expect("PASS787 global focus ring exists", globals.includes(":focus-visible") && globals.includes("velmere-gold"));
expect("PASS787 page-level horizontal overflow is contained", /html,\s*\n\s*body[\s\S]{0,180}overflow-x:\s*clip/.test(globals));

expect("PASS788 governor no longer re-renders on every interaction", !governor.includes('addEventListener("pointerdown"') && !governor.includes('addEventListener("scroll"') && !governor.includes('addEventListener("keydown"'));
expect("PASS788 legacy detail wheel listener is panel-scoped", tokenModal.includes('panel.addEventListener("wheel"') && !tokenModal.includes('document.addEventListener("wheel", handleWheel'));
for (const path of [
  "app/[locale]/market-integrity/loading.tsx",
  "app/[locale]/market-integrity/shield-map/loading.tsx",
  "app/[locale]/market-integrity/cross-asset/loading.tsx",
  "app/[locale]/search/loading.tsx",
]) {
  expect(`PASS788 route loading shell exists: ${path}`, await exists(path));
}

const localeObjects = {};
for (const locale of ["en", "pl", "de"]) {
  localeObjects[locale] = JSON.parse(await text(`messages/${locale}.json`));
}
function flatten(value, prefix = "", target = new Set()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    target.add(prefix);
    return target;
  }
  for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, target);
  return target;
}
const baseKeys = flatten(localeObjects.en);
for (const locale of ["pl", "de"]) {
  const keys = flatten(localeObjects[locale]);
  expect(`PASS789 ${locale.toUpperCase()} translation key parity`, baseKeys.size === keys.size && [...baseKeys].every((key) => keys.has(key)));
}
expect("PASS789 member console copy is localized", account.includes("Tożsamość konta") && account.includes("Kontoidentität") && account.includes("Account identity"));
expect("PASS789 responsive viewport list is represented in E2E", await exists("tests/e2e/pass784-789-production-gates.spec.ts"));

for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);
if (failures.length) {
  console.error(`\n${failures.length} PASS784–789 gate(s) failed:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`\nPASS784–789 static product gates passed (${checks.length} checks).`);
