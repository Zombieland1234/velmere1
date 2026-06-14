import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const locales = ["pl", "en", "de"];
const coreRoutes = [
  "",
  "/shop",
  "/collection",
  "/market-integrity",
  "/shield-map",
  "/real-markets",
  "/search",
  "/square",
  "/member",
  "/security",
  "/security/audits",
  "/security/audits/sample",
  "/security/audits/pricing",
  "/security/audits/registry",
  "/security/audits/report/sample",
  "/security/audits/export/sample",
  "/shop/essential-oversized-hoodie",
  "/vlm-token",
  "/lookbook",
  "/archive",
  "/terms",
  "/privacy",
  "/shipping",
  "/returns",
  "/impressum",
  "/contact",
  "/token-agreement",
  "/cart",
  "/checkout/success",
  "/checkout/cancel",
  "/admin/import-products",
  "/admin/security/audit-inbox",
];

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function routeToCandidates(locale, route) {
  if (route === "") return [`app/${locale}/page.tsx`, "app/[locale]/page.tsx"];
  if (route.startsWith("/shop/") && route !== "/shop") {
    return [`app/${locale}/shop/[id]/page.tsx`, "app/[locale]/shop/[id]/page.tsx"];
  }
  if (route.startsWith("/security/audits/report/") && route !== "/security/audits/report") {
    return [
      `app/${locale}/security/audits/report/[id]/page.tsx`,
      "app/[locale]/security/audits/report/[id]/page.tsx",
    ];
  }
  if (route.startsWith("/security/audits/export/") && route !== "/security/audits/export") {
    return [
      `app/${locale}/security/audits/export/[id]/page.tsx`,
      "app/[locale]/security/audits/export/[id]/page.tsx",
    ];
  }
  const clean = route.replace(/^\//, "");
  return [
    `app/${locale}/${clean}/page.tsx`,
    `app/[locale]/${clean}/page.tsx`,
    `app/${clean}/page.tsx`,
  ];
}

const failures = [];
for (const locale of locales) {
  for (const route of coreRoutes) {
    const candidates = routeToCandidates(locale, route);
    if (!candidates.some(exists)) {
      failures.push(`/${locale}${route || ""} missing route file; checked ${candidates.join(", ")}`);
    }
  }
}

for (const route of ["real-markets", "shield-map", "collection"]) {
  if (!exists(`app/${route}/page.tsx`)) {
    failures.push(`root /${route} redirect/surface page missing`);
  }
}

if (failures.length) {
  console.error(`static route smoke failed (${failures.length})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`static route smoke ok (${locales.length * coreRoutes.length} localized routes + 3 root surfaces)`);
