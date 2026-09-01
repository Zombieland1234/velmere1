import fs from "node:fs";

const results: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
function check(id: string, passed: unknown, detail?: unknown) {
  results.push({ id, passed: Boolean(passed), detail });
}

const checkoutSource = fs.readFileSync("components/checkout/VelmereCheckoutFlowClient.tsx", "utf8");
const checkoutBoundarySource = fs.readFileSync("lib/commerce/checkout-browser-privacy.ts", "utf8");
const registrySource = fs.readFileSync("lib/security/audit-case-client-registry.ts", "utf8");
const portalSource = fs.readFileSync("components/account/AuditCasesPortalClient.tsx", "utf8");
const receiptSource = fs.readFileSync("lib/market-integrity/pdf-a4-download-receipt.ts", "utf8");
const lensCopySource = fs.readFileSync("lib/search/lens-locale-copy.ts", "utf8");

check("checkout:no-localstorage-read", !checkoutSource.includes("localStorage.getItem"));
check("checkout:no-localstorage-write", !checkoutSource.includes("localStorage.setItem"));
check("checkout:uses-purge-only-boundary", checkoutSource.includes("purgeLegacyCheckoutPiiDrafts"));
check("checkout:pii-fields-remain-react-state", checkoutSource.includes("fullName: string") && checkoutSource.includes("address: string"));
check("checkout:copy-says-memory-only", checkoutSource.includes("only in memory") && checkoutSource.includes("tylko w pamięci"));
check("checkout:server-account-copy", checkoutSource.includes("signed account on the server") && checkoutSource.includes("podpisanym kontem po stronie serwera"));
check("checkout-boundary:no-read", !checkoutBoundarySource.includes("getItem("));
check("checkout-boundary:no-write", !checkoutBoundarySource.includes("setItem("));
check("checkout-boundary:three-locale-keys", ["-pl", "-en", "-de"].every((part) => checkoutBoundarySource.includes(`draft${part}`)));

check("audit-registry:no-localstorage-read", !registrySource.includes("localStorage.getItem"));
check("audit-registry:no-localstorage-write", !registrySource.includes("localStorage.setItem"));
check("audit-registry:memory-only", registrySource.includes("inMemoryAuditCaseBookmarks"));
check("audit-registry:legacy-remove-only", registrySource.includes("localStorage.removeItem(PASS4614_AUDIT_CASE_REGISTRY_KEY)"));
check("audit-portal:no-storage-event", !portalSource.includes('addEventListener("storage"'));
check("audit-portal:custom-event-retained", portalSource.includes("PASS4614_AUDIT_CASE_REGISTRY_EVENT"));

check("pdf-receipt:no-localstorage-read", !receiptSource.includes("localStorage.getItem"));
check("pdf-receipt:no-localstorage-write", !receiptSource.includes("localStorage.setItem"));
check("pdf-receipt:memory-only", receiptSource.includes("inMemoryPdfDownloadReceipts"));
check("pdf-receipt:legacy-remove-only", receiptSource.includes("localStorage.removeItem(RECEIPT_STORAGE_KEY)"));
check("pdf-copy:current-tab-pl", lensCopySource.includes("pamięci bieżącej karty"));
check("pdf-copy:current-tab-de", lensCopySource.includes("Speicher des aktuellen Tabs"));
check("pdf-copy:current-tab-en", lensCopySource.includes("current tab memory"));

const calls = { get: 0, set: 0, remove: [] as string[], dispatch: 0 };
const fakeStorage = {
  get length() { return 0; },
  clear() {},
  key() { return null; },
  getItem() { calls.get += 1; throw new Error("legacy browser data must never be read"); },
  setItem() { calls.set += 1; throw new Error("private customer data must never be persisted"); },
  removeItem(key: string) { calls.remove.push(key); },
};
class FakeCustomEvent {
  type: string;
  detail: unknown;
  constructor(type: string, init?: { detail?: unknown }) {
    this.type = type;
    this.detail = init?.detail;
  }
}
Object.defineProperty(globalThis, "CustomEvent", { configurable: true, value: FakeCustomEvent });
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: fakeStorage,
    dispatchEvent() { calls.dispatch += 1; return true; },
  },
});

const checkoutBoundary = await import("../../lib/commerce/checkout-browser-privacy.ts");
const removed = checkoutBoundary.purgeLegacyCheckoutPiiDrafts(fakeStorage as unknown as Storage);
check("runtime:checkout-three-removals", removed === 3, { removed, keys: calls.remove });
check("runtime:checkout-no-read", calls.get === 0, calls);
check("runtime:checkout-no-write", calls.set === 0, calls);
check("runtime:checkout-exact-legacy-keys", checkoutBoundary.LEGACY_CHECKOUT_DRAFT_KEYS.every((key: string) => calls.remove.includes(key)), calls.remove);

const registry = await import("../../lib/security/audit-case-client-registry.ts");
check("runtime:audit-empty", registry.readAuditCaseBookmarks().length === 0);
check("runtime:audit-remember-valid", registry.rememberAuditCaseRef("AUD-ABCDEF123456", { tier: "advanced" }));
const bookmarks = registry.readAuditCaseBookmarks();
check("runtime:audit-one-memory-row", bookmarks.length === 1 && bookmarks[0].caseRef === "AUD-ABCDEF123456", bookmarks);
check("runtime:audit-tier-bound", bookmarks[0].tier === "advanced", bookmarks[0]);
bookmarks[0].caseRef = "AUD-TAMPERED0000";
check("runtime:audit-defensive-copy", registry.readAuditCaseBookmarks()[0].caseRef === "AUD-ABCDEF123456");
check("runtime:audit-invalid-rejected", registry.rememberAuditCaseRef("../../secret") === false);
check("runtime:audit-forget", registry.forgetAuditCaseRef("AUD-ABCDEF123456") && registry.readAuditCaseBookmarks().length === 0);
check("runtime:audit-custom-events", calls.dispatch >= 2, calls.dispatch);

const pdfReceipts = await import("../../lib/market-integrity/pdf-a4-download-receipt.ts");
const receipt = pdfReceipts.buildPass469PdfDownloadReceipt({
  filename: "velmere-btc-advanced.pdf",
  symbol: "BTC",
  depth: "advanced",
  reportChecksum: "a".repeat(64),
  sourceConfidence: 88,
  sourceCount: 4,
  now: new Date("2026-07-30T00:00:00.000Z"),
});
check("runtime:pdf-write-memory", pdfReceipts.writePass469PdfDownloadReceipt(receipt));
const receiptRows = pdfReceipts.readPass469PdfDownloadReceipts();
check("runtime:pdf-one-memory-row", receiptRows.length === 1 && receiptRows[0].receiptId === receipt.receiptId, receiptRows);
receiptRows[0].symbol = "TAMPER";
check("runtime:pdf-defensive-copy", pdfReceipts.readPass469PdfDownloadReceipts()[0].symbol === "BTC");
check("runtime:pdf-no-raw-payload", pdfReceipts.readPass469PdfDownloadReceipts()[0].containsRawPayload === false);
check("runtime:all-legacy-access-remove-only", calls.get === 0 && calls.set === 0, calls);
check("runtime:legacy-audit-key-removed", calls.remove.includes(registry.PASS4614_AUDIT_CASE_REGISTRY_KEY), calls.remove);
check("runtime:legacy-pdf-key-removed", calls.remove.includes("velmere:pass469:pdf-download-receipts"), calls.remove);

const failed = results.filter((row) => !row.passed);
const receiptOutput = {
  status: failed.length
    ? "FAIL_A102R8_CHECKOUT_CUSTOMER_BROWSER_PRIVACY_BOUNDARY"
    : "PASS_A102R8_CHECKOUT_PII_AUDIT_CASE_AND_PDF_METADATA_BROWSER_PERSISTENCE_FAIL_CLOSED_NO_PROMOTION",
  assertions: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  results,
  truth: {
    checkoutPiiPersistedInBrowserStorage: false,
    auditCaseRefsPersistedInBrowserStorage: false,
    pdfActivityMetadataPersistedInBrowserStorage: false,
    legacyBrowserRowsReadOrMigrated: false,
    durableServerCheckoutDraftProven: false,
    durableServerAuditBookmarkProven: false,
    durableServerPdfReceiptProven: false,
    liveCredit: false,
    saleCredit: false,
  },
};
console.log(JSON.stringify(receiptOutput, null, 2));
if (failed.length) process.exitCode = 1;
