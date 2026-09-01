import fs from "node:fs";
import path from "node:path";
import {
  LEGACY_ADMIN_PRODUCT_DRAFT_STORAGE_KEYS,
  PASS36_A102R12_ADMIN_PRODUCT_DRAFT_BROWSER_STATE_BOUNDARY_ID,
  clearAdminProductDraftCurrentTabState,
  purgeLegacyAdminProductDraftBrowserState,
  readAdminProductDraftCurrentTabState,
  resetAdminProductDraftCurrentTabStateForTests,
  writeAdminProductDraftCurrentTabState,
} from "../../lib/security/admin-product-draft-browser-state";
import type { ProductImportDraft } from "../../lib/products/types";

const root = process.cwd();
let passed = 0;
const failures: string[] = [];
function check(name: string, condition: unknown) {
  if (condition) passed += 1;
  else failures.push(name);
}

function draft(index: number, description = `private operator description ${index}`): ProductImportDraft {
  const id = `draft_manual_${index}`;
  return {
    draftId: id,
    product: {
      id,
      slug: `product-${index}`,
      provider: "manual",
      status: "draft",
      fulfilmentMode: "disabled",
      title: { pl: `Produkt ${index}`, en: `Product ${index}`, de: `Produkt ${index}` },
      description: { pl: description, en: description, de: description },
      shortDescription: { pl: "private", en: "private", de: "private" },
      price: { amount: 100 + index, currency: "EUR" },
      images: [],
      variants: [{ id: `variant-${index}`, title: "M", size: "M", providerStatus: "unknown" }],
      tags: ["private-admin-draft"],
      importSource: {
        type: "url",
        sourceUrl: `https://operator.example/private/${index}`,
        importedAt: "2026-07-30T05:00:00.000Z",
        warnings: ["operator review required"],
      },
    },
    warnings: ["provider identity pending"],
    validationErrors: [],
  };
}

const helperSource = fs.readFileSync(path.join(root, "lib/security/admin-product-draft-browser-state.ts"), "utf8");
const pageSource = fs.readFileSync(path.join(root, "app/[locale]/admin/import-products/page.tsx"), "utf8");

check("boundary-id", PASS36_A102R12_ADMIN_PRODUCT_DRAFT_BROWSER_STATE_BOUNDARY_ID.includes("a102r12"));
check("static:page-no-localstorage-read", !pageSource.includes("localStorage.getItem"));
check("static:page-no-localstorage-write", !pageSource.includes("localStorage.setItem"));
check("static:page-no-persistent-draft-keys", !pageSource.includes("velmere-admin-import-drafts-v2") && !pageSource.includes("velmere-admin-import-selected-v2"));
check("static:page-current-tab-helper-read", pageSource.includes("readAdminProductDraftCurrentTabState"));
check("static:page-current-tab-helper-write", pageSource.includes("writeAdminProductDraftCurrentTabState"));
check("static:page-scope-hash", pageSource.includes("admin-product-draft-scope") && pageSource.includes("sha256Token"));
check("static:page-strict-response-json", pageSource.includes("readBrowserJsonObject<Record<string, unknown>>") && !pageSource.includes("JSON.parse(raw)") && !pageSource.includes("raw.slice"));
check("static:helper-no-browser-persistence", !/sessionStorage|indexedDB|CacheStorage|caches\./u.test(helperSource));
check("static:helper-legacy-delete-only", helperSource.includes("removeItem") && !helperSource.includes("getItem(") && !helperSource.includes("setItem("));
check("static:no-cross-tab-event-authority", !helperSource.includes("storage") || helperSource.includes("RemovableStorage"));
check("legacy-key-denominator", LEGACY_ADMIN_PRODUCT_DRAFT_STORAGE_KEYS.length === 2);

const removed: string[] = [];
const fakeStorage = { removeItem(key: string) { removed.push(key); } };
check("legacy-purge-two-keys", purgeLegacyAdminProductDraftBrowserState(fakeStorage) === 2);
check("legacy-purge-exact-keys", removed.join("|") === LEGACY_ADMIN_PRODUCT_DRAFT_STORAGE_KEYS.join("|"));

const scopeA = "a".repeat(32);
const scopeB = "b".repeat(32);
resetAdminProductDraftCurrentTabStateForTests();
const first = writeAdminProductDraftCurrentTabState({
  scopeDigest: scopeA,
  drafts: [draft(1), draft(2)],
  selectedDraftIds: ["draft_manual_1", "missing", "draft_manual_1"],
});
check("write-valid-scope", first.stored === true);
const readA = readAdminProductDraftCurrentTabState(scopeA);
check("read-same-scope", readA?.drafts.length === 2);
check("selected-filtered-deduplicated", readA?.selectedDraftIds.length === 1 && readA.selectedDraftIds[0] === "draft_manual_1");
if (readA) readA.drafts[0].product.title.en = "mutated outside store";
check("defensive-clone", readAdminProductDraftCurrentTabState(scopeA)?.drafts[0].product.title.en === "Product 1");
check("different-scope-no-restore", readAdminProductDraftCurrentTabState(scopeB) === null);
check("scope-switch-erases-prior", readAdminProductDraftCurrentTabState(scopeA) === null);
check("invalid-scope-rejected", writeAdminProductDraftCurrentTabState({ scopeDigest: "not-a-digest", drafts: [draft(1)], selectedDraftIds: [] }).stored === false);

resetAdminProductDraftCurrentTabStateForTests();
const many = Array.from({ length: 120 }, (_, index) => draft(index));
const bounded = writeAdminProductDraftCurrentTabState({
  scopeDigest: scopeA,
  drafts: many,
  selectedDraftIds: many.map((item) => item.draftId),
});
const boundedRead = readAdminProductDraftCurrentTabState(scopeA);
check("draft-count-bounded-100", bounded.stored === true && boundedRead?.drafts.length === 100);
check("selected-count-bounded-100", boundedRead?.selectedDraftIds.length === 100);
check("clear-same-scope", clearAdminProductDraftCurrentTabState(scopeA) === true && readAdminProductDraftCurrentTabState(scopeA) === null);
check("clear-other-scope-no-effect", clearAdminProductDraftCurrentTabState(scopeB) === false);

resetAdminProductDraftCurrentTabStateForTests();
const oversized = writeAdminProductDraftCurrentTabState({
  scopeDigest: scopeA,
  drafts: [draft(1, "x".repeat(8 * 1024 * 1024 + 256))],
  selectedDraftIds: ["draft_manual_1"],
});
check("oversized-snapshot-rejected", !oversized.stored && oversized.reason === "snapshot_too_large");
check("oversized-not-stored", readAdminProductDraftCurrentTabState(scopeA) === null);

resetAdminProductDraftCurrentTabStateForTests();
const dangerous = JSON.parse(JSON.stringify(draft(7))) as ProductImportDraft & Record<string, unknown>;
dangerous.product = JSON.parse(`{"__proto__":{"polluted":true},"id":"x"}`) as ProductImportDraft["product"];
const dangerousResult = writeAdminProductDraftCurrentTabState({
  scopeDigest: scopeA,
  drafts: [dangerous],
  selectedDraftIds: [],
});
check("dangerous-json-key-rejected", !dangerousResult.stored && dangerousResult.reason === "invalid_snapshot");
check("prototype-not-polluted", ({} as Record<string, unknown>).polluted === undefined);

const result = {
  status: failures.length ? "FAIL_A102R12_ADMIN_PRODUCT_DRAFT_BROWSER_STATE" : "PASS_A102R12_ADMIN_PRODUCT_DRAFT_BROWSER_STATE_LOCAL_ONLY",
  boundaryId: PASS36_A102R12_ADMIN_PRODUCT_DRAFT_BROWSER_STATE_BOUNDARY_ID,
  passed,
  failed: failures.length,
  failures,
  truth: {
    localStorageAuthority: false,
    crossTabAuthority: false,
    accountScopeBound: true,
    strictResponseJson: true,
    legacyDataReadOrMigrated: false,
    durableServerDraftStorageProven: false,
    realBrowserProven: false,
    liveProven: false,
    saleEnabled: false,
  },
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
