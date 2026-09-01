import fs from "node:fs";
import path from "node:path";
import {
  PASS36_A102R10_EXTERNAL_NAVIGATION_BOUNDARY_ID,
  buildSafeExternalNavigationDecision,
  normalizeExternalProductUrl,
  normalizeSafeExternalBrowserUrl,
  openSafeExternalBrowserWindow,
  parseAllowedExternalHosts,
} from "@/lib/security/browser-external-navigation";
import { importProductFromUrl } from "@/lib/importers/url-importer";
import { createDraft } from "@/lib/importers/common";
import { buildProductPublishDecision } from "@/lib/products/publish-decision";
import { normalizeLocalProductForStore } from "@/lib/products/local-product-store";
import type { ProductImportDraft } from "@/lib/products/types";

let checks = 0;
let failed = 0;
function check(id: string, condition: unknown, detail?: unknown) {
  checks += 1;
  if (!condition) {
    failed += 1;
    console.error(JSON.stringify({ id, passed: false, detail }));
  }
}

function minimalDraft(externalUrl: string): ProductImportDraft {
  const draft = createDraft({
    title: "Safe external product",
    externalUrl,
    sourceUrl: externalUrl,
    sourceType: "url",
    provider: "external",
    priceAmount: 1000,
    image: "/images/product.png",
    variants: [{ id: "v1", title: "M", size: "M", available: true }],
  });
  return {
    ...draft,
    validationErrors: [],
    warnings: [],
    brain: {
      schemaVersion: "velmere.product-brain.v2",
      detected: { garmentType: "tshirt", confidence: 1, language: "en", materials: [], colors: [], fit: "regular", category: "tops" },
      providerAdapter: {
        name: "external", sourceQuality: "strong", variantMappingStatus: "complete", stockStatus: "not_applicable",
        priceStatus: "complete", sizeGuideStatus: "complete", providerProductId: "external-1", externalUrl,
        variantCount: 1, mappedVariantCount: 1, availableVariantCount: 1, warnings: [],
      },
      productTruth: { source: "operator_reviewed", summary: "reviewed", facts: [], missing: [] },
      copy: { pl: { title: "Safe", shortDescription: "Safe", description: "Safe" }, en: { title: "Safe", shortDescription: "Safe", description: "Safe" }, de: { title: "Safe", shortDescription: "Safe", description: "Safe" } },
      readiness: { level: "ready", score: 100, canPublishComingSoon: true, canPublishActive: true, missing: [] },
      warnings: [],
    } as ProductImportDraft["brain"],
  };
}

async function main() {
  check("boundary_id", PASS36_A102R10_EXTERNAL_NAVIGATION_BOUNDARY_ID.includes("a102r10"));
  const allowed = parseAllowedExternalHosts("shop.example.com,WWW.SEC.GOV., localhost, 127.0.0.1, bad host");
  check("host_parser_accepts_public", allowed.has("shop.example.com") && allowed.has("www.sec.gov"));
  check("host_parser_rejects_local_invalid", !allowed.has("localhost") && !allowed.has("127.0.0.1") && allowed.size === 2);

  const walletUrls = [
    "https://metamask.io/download/", "https://phantom.app/download", "https://trustwallet.com/",
    "https://www.coinbase.com/wallet/downloads", "https://rainbow.me/", "https://www.okx.com/web3",
    "https://www.ledger.com/ledger-live", "https://app.safe.global/", "https://zerion.io/", "https://walletconnect.com/",
  ];
  for (const [index, url] of walletUrls.entries()) {
    check(`wallet_allow_${index}`, Boolean(normalizeSafeExternalBrowserUrl(url, { profile: "wallet_install" })), url);
  }
  const walletReject = [
    "http://metamask.io/download/", "https://user:pass@metamask.io/download/", "https://metamask.io:444/download/",
    "https://metamask.io/download/?code=secret", "https://metamask.io/download/#token", "https://metamask.io/evil",
    "https://evil.example/download/", "https://localhost/download/",
  ];
  for (const [index, url] of walletReject.entries()) {
    check(`wallet_reject_${index}`, normalizeSafeExternalBrowserUrl(url, { profile: "wallet_install" }) === null, url);
  }

  check("sec_allow", normalizeSafeExternalBrowserUrl("https://www.sec.gov/Archives/edgar/data/320193/000032019324000123/", { profile: "sec_filing" })?.startsWith("https://www.sec.gov/Archives/") === true);
  for (const [index, url] of [
    "https://sec.gov/Archives/edgar/data/320193/1/", "https://www.sec.gov/ixviewer/doc/action", "https://www.sec.gov/Archives/edgar/data/a/1/",
    "https://www.sec.gov/Archives/edgar/data/1/2/?token=x", "https://www.sec.gov/Archives/edgar/data/1/2/#x",
  ].entries()) check(`sec_reject_${index}`, normalizeSafeExternalBrowserUrl(url, { profile: "sec_filing" }) === null, url);

  const productAllowed = new Set(["shop.example.com"]);
  const normalizedProduct = normalizeExternalProductUrl("https://shop.example.com/item/42?utm_source=velmere#details", productAllowed);
  check("product_canonical_strips_query_hash", normalizedProduct === "https://shop.example.com/item/42");
  const productDecision = buildSafeExternalNavigationDecision("https://shop.example.com/item/42?utm_source=velmere#details", { profile: "external_product", allowedHosts: productAllowed });
  check("product_decision_records_stripping", productDecision.allowed && productDecision.strippedQuery && productDecision.strippedFragment);
  const productReject = [
    "javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "http://shop.example.com/item", "https://u:p@shop.example.com/item",
    "https://shop.example.com:8443/item", "https://localhost/item", "https://127.0.0.1/item", "https://evil.example/item",
    "https://shop.example.com/item?token=secret", "https://shop.example.com/%2fadmin",
  ];
  for (const [index, url] of productReject.entries()) check(`product_reject_${index}`, normalizeExternalProductUrl(url, productAllowed) === null, url);
  check("browser_product_defense_in_depth", normalizeSafeExternalBrowserUrl("https://shop.example.com/item?utm=1#x", { profile: "external_product" }) === "https://shop.example.com/item");

  const originalWindow = (globalThis as { window?: unknown }).window;
  let openedArgs: unknown[] | null = null;
  const opened = { opener: { unsafe: true } as unknown };
  (globalThis as { window?: unknown }).window = {
    open: (...args: unknown[]) => { openedArgs = args; return opened; },
  };
  check("safe_open_allows_wallet", openSafeExternalBrowserWindow("https://metamask.io/download/", { profile: "wallet_install" }));
  check("safe_open_exact_target_features", openedArgs?.[1] === "_blank" && openedArgs?.[2] === "noopener,noreferrer", openedArgs);
  check("safe_open_explicit_opener_null", opened.opener === null);
  openedArgs = null;
  check("safe_open_blocks_untrusted", !openSafeExternalBrowserWindow("https://evil.example/", { profile: "wallet_install" }) && openedArgs === null);
  (globalThis as { window?: unknown }).window = originalWindow;

  const oldEnv = process.env.VELMERE_PRODUCT_IMPORT_ALLOWED_HOSTS;
  process.env.VELMERE_PRODUCT_IMPORT_ALLOWED_HOSTS = "shop.example.com";
  const javascriptDraft = await importProductFromUrl("javascript:alert(document.domain)");
  check("import_javascript_no_customer_url", !javascriptDraft.product.externalUrl && javascriptDraft.product.fulfilmentMode === "disabled");
  check("import_javascript_retains_only_admin_source", javascriptDraft.product.importSource?.sourceUrl?.startsWith("javascript:") && javascriptDraft.warnings.includes("external customer link disabled"));
  const disallowedDraft = await importProductFromUrl("https://evil.example/item?token=secret#x");
  check("import_disallowed_host_no_external_link", !disallowedDraft.product.externalUrl && disallowedDraft.product.fulfilmentMode === "disabled");
  const separated = createDraft({ title: "Separated", sourceType: "url", sourceUrl: "https://review.example/source", warnings: ["blocked"] });
  check("draft_source_separated_from_customer_link", separated.product.importSource?.sourceUrl === "https://review.example/source" && !separated.product.externalUrl && separated.product.fulfilmentMode === "disabled");

  const unsafe = minimalDraft("javascript:alert(1)");
  const unsafeComingSoon = buildProductPublishDecision(unsafe, "coming_soon");
  const unsafeActive = buildProductPublishDecision(unsafe, "active");
  check("publish_blocks_unsafe_coming_soon", !unsafeComingSoon.publishAllowed && unsafeComingSoon.reasons.some((row) => row.code === "external_link_unsafe"));
  check("publish_blocks_unsafe_active", !unsafeActive.publishAllowed && unsafeActive.activeBlocked);
  const safe = minimalDraft("https://shop.example.com/item/42");
  const safeDecision = buildProductPublishDecision(safe, "coming_soon");
  check("publish_accepts_exact_allowlisted_url", safeDecision.snapshot.externalLinkSafe && !safeDecision.reasons.some((row) => row.code === "external_link_unsafe"));
  const queryDraft = minimalDraft("https://shop.example.com/item/42?utm=velmere");
  check("publish_blocks_noncanonical_query_url", !buildProductPublishDecision(queryDraft, "coming_soon").publishAllowed);

  const normalizedUnsafeStore = normalizeLocalProductForStore(unsafe.product);
  check("store_drops_unsafe_external_url", !normalizedUnsafeStore.externalUrl && normalizedUnsafeStore.fulfilmentMode !== "external_link");
  const normalizedSafeStore = normalizeLocalProductForStore(safe.product);
  check("store_preserves_safe_external_url", normalizedSafeStore.externalUrl === "https://shop.example.com/item/42" && normalizedSafeStore.fulfilmentMode === "external_link");
  process.env.VELMERE_PRODUCT_IMPORT_ALLOWED_HOSTS = oldEnv;

  const roots = ["app", "components", "lib"];
  const files: string[] = [];
  const walk = (relative: string) => {
    for (const entry of fs.readdirSync(relative, { withFileTypes: true })) {
      const child = path.join(relative, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (/\.(?:ts|tsx|js|jsx|mjs|cjs)$/u.test(entry.name)) files.push(child);
    }
  };
  roots.forEach(walk);
  const rows = files.map((file) => ({ file, text: fs.readFileSync(file, "utf8") }));
  const rawWindowOpen = rows.filter((row) => row.text.includes("window.open("));
  check("single_central_window_open_sink", rawWindowOpen.length === 1 && rawWindowOpen[0].file.endsWith("lib/security/browser-external-navigation.ts"), rawWindowOpen.map((row) => row.file));
  const productComponent = fs.readFileSync("components/shop/ProductDetailClient.tsx", "utf8");
  check("product_anchor_uses_safe_url", productComponent.includes("href={safeExternalProductUrl ?? undefined}") && !productComponent.includes("href={selectedProduct.externalUrl}"));
  check("external_anchors_no_referrer_opener", rows.filter((row) => row.text.includes('target="_blank"')).every((row) => row.text.includes('rel="noopener noreferrer external"') && row.text.includes('referrerPolicy="no-referrer"')));
  const importer = fs.readFileSync("lib/importers/url-importer.ts", "utf8");
  check("importer_never_promotes_blocked_raw_url", importer.includes("external customer link disabled") && !importer.includes("externalUrl: url,"));
  const publish = fs.readFileSync("lib/products/publish-decision.ts", "utf8");
  check("publish_gate_exact_allowlist", publish.includes("external_link_unsafe") && publish.includes("externalLinkSafe"));

  const status = failed === 0 ? "PASS_A102R10_EXTERNAL_NAVIGATION_FAIL_CLOSED_NO_PROMOTION" : "FAIL_A102R10_EXTERNAL_NAVIGATION";
  console.log(JSON.stringify({ status, checks, passed: checks - failed, failed }));
  if (failed) process.exitCode = 1;
}

await main();
