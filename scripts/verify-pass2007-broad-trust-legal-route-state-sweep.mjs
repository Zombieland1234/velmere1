import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const files = {
  loading: read("app/[locale]/loading.tsx"),
  sharedLoading: read("components/ui/RouteLoadingShell.tsx"),
  error: read("app/[locale]/error.tsx"),
  notFound: read("app/[locale]/not-found.tsx"),
  globalNotFound: read("app/not-found.tsx"),
  legal: read("components/legal/LegalDraftPage.tsx"),
  contact: read("app/[locale]/contact/page.tsx"),
  faq: read("app/[locale]/faq/page.tsx"),
  research: read("app/[locale]/research-lab/page.tsx"),
  security: read("components/security/SecurityTrustPage.tsx"),
  css: read("app/globals.css"),
  packageJson: read("package.json"),
};

const checks = [];
const add = (name, ok) => checks.push({ name, ok });

add("Locale loading exposes busy and live semantics", files.loading.includes('aria-busy="true"') && files.loading.includes('aria-live="polite"'));
add("Loading surfaces use stable PASS2007 solid markers", files.loading.includes('data-pass2007-route-loading="stable-solid-low-motion"') && files.sharedLoading.includes('data-pass2007-shared-route-loading="stable-solid-low-motion"'));
add("Error boundary no longer makes unverifiable session-safety claims", !files.error.includes("Your session stays protected") && !files.error.includes("Twoja sesja i pozostałe części Velmère są bezpieczne"));
add("Error animation is short and surface is solid", files.error.includes("duration: 0.24") && files.error.includes('data-pass2007-error-boundary="truthful-solid-low-motion"'));
add("Localized 404 removes decorative orbit noise", files.notFound.includes('data-pass2007-not-found="solid-cyan-no-orbit-noise"') && !files.notFound.includes("velmere-not-found-orbit"));
add("Global 404 offers PL, DE and EN routes", files.globalNotFound.includes('href="/pl"') && files.globalNotFound.includes('href="/de"') && files.globalNotFound.includes('href="/en"'));
add("Legal page is one readable document instead of stacked cards", files.legal.includes('data-pass2007-legal="single-document-no-card-stack"') && files.legal.includes("pass2007-legal-section border-t"));
add("Legal multiline rendering splits content once", files.legal.includes('const lines = text.split("\\n")') && !files.legal.includes('index < text.split("\\n").length'));
add("Contact primary route uses a solid cyan state", files.contact.includes('data-pass2007-contact="solid-service-cyan-focus"') && files.contact.includes("pass2007-contact-primary"));
add("FAQ uses unframed divider accordion rows", files.faq.includes('data-pass2007-faq="solid-accordion-cyan-focus-low-motion"') && files.faq.includes("pass2007-faq-item group border-t"));
add("Research claim boundary is visually restrained", files.research.includes('data-pass2007-research="solid-evidence-cyan-no-card-stack"') && files.research.includes("pass2007-research-boundary"));
add("Security protections are independent cards without row dividers", files.security.includes('data-pass2007-security="solid-trust-cyan-no-row-lines"') && files.security.includes("pass2007-security-protections mt-5 grid"));
add("PASS2007 CSS disables heavy blur on scoped surfaces", files.css.includes("PASS2007 - broad trust, research, legal and route-state sweep") && files.css.includes("backdrop-filter: none !important"));
add("PASS2007 CSS defines cyan focus and reduced-motion coverage", files.css.includes('[data-pass2007-error-boundary="truthful-solid-low-motion"] button:focus-visible') && files.css.includes('[data-pass2007-security="solid-trust-cyan-no-row-lines"] *'));
add("Package contains PASS2007 verifier", files.packageJson.includes("verify:pass2007-broad-trust-legal-route-state-sweep"));
add("package.json parses", (() => { try { JSON.parse(files.packageJson); return true; } catch { return false; } })());
add("CSS braces are balanced", (() => {
  let depth = 0;
  for (const char of files.css) {
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
})());

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? "OK" : "FAIL"} ${check.name}`);
if (failed.length) {
  console.error(`PASS2007 verification failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS2007 verification passed: ${checks.length}/${checks.length}`);
