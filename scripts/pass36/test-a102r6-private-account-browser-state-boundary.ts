import fs from "node:fs";
import {
  clearPrivateAccountTabStore,
  getPrivateAccountTabStoreSnapshot,
  LEGACY_PRIVATE_ACCOUNT_STORAGE_KEYS,
  purgeLegacyPrivateAccountLocalStorage,
  readPrivateAccountTabArray,
  subscribePrivateAccountTabStore,
  writePrivateAccountTabArray,
} from "../../lib/account/private-account-ephemeral-store.ts";

const results: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
function check(id: string, passed: unknown, detail?: unknown) {
  results.push({ id, passed: Boolean(passed), detail });
}

const helperSource = fs.readFileSync("lib/account/private-account-ephemeral-store.ts", "utf8");
const inboxSource = fs.readFileSync("components/account/MarketActionReportsInboxClient.tsx", "utf8");
const modalSource = fs.readFileSync("components/market-integrity/AssetDetailModal.tsx", "utf8");
const fallbackStart = modalSource.indexOf("function buildPass4547ClientVaultFallback");
const fallbackEnd = modalSource.indexOf("async function postPass4547AssetReportVaultBridge", fallbackStart);
const fallbackSource = modalSource.slice(fallbackStart, fallbackEnd);

check("helper:no-localstorage-read", !helperSource.includes("localStorage.getItem"));
check("helper:no-localstorage-write", !helperSource.includes("localStorage.setItem"));
check("helper:no-sessionstorage-authority", !helperSource.includes("sessionStorage"));
check("helper:no-indexeddb-or-cache", !/indexedDB|caches\.|CacheStorage/u.test(helperSource));
check("inbox:no-localstorage-authority", !inboxSource.includes("window.localStorage"));
check("inbox:no-cross-tab-storage-event", !inboxSource.includes('"storage"'));
check("inbox:ephemeral-reader", inboxSource.includes("readPrivateAccountTabArray"));
check("inbox:ephemeral-writer", inboxSource.includes("writePrivateAccountTabArray"));
check("inbox:legacy-purge", inboxSource.includes("purgeLegacyPrivateAccountLocalStorage"));
check("modal:no-localstorage-authority", !modalSource.includes("window.localStorage"));
check("modal:ephemeral-reader", modalSource.includes("readPrivateAccountTabArray"));
check("modal:ephemeral-writer", modalSource.includes("writePrivateAccountTabArray"));
check("modal:legacy-purge", modalSource.includes("purgeLegacyPrivateAccountLocalStorage"));
check("fallback:server-unavailable", fallbackSource.includes('deliveryState: "server-unavailable"'));
check("fallback:not-server-stored", fallbackSource.includes("serverStored: false"));
check("fallback:no-ready-vault", !fallbackSource.includes("account-vault-ready") && !fallbackSource.includes('state: "ready"'));
check("fallback:no-durable-digest", fallbackSource.includes("server-unconfirmed-no-vault-digest"));
check("fallback:no-pointer-route-authority", fallbackSource.includes('accountRoute: "/account?tab=reports"'));
check("fallback:blocked-boundary", fallbackSource.includes("client-placeholder-no-server-vault-no-paid-unlock-no-trade-execution"));

const removed: string[] = [];
let getCalls = 0;
let setCalls = 0;
const fakeLocalStorage = {
  removeItem(key: string) { removed.push(key); },
  getItem(_key: string) { getCalls += 1; throw new Error("legacy values must never be read"); },
  setItem(_key: string, _value: string) { setCalls += 1; throw new Error("private state must never be persisted"); },
};
Object.defineProperty(globalThis, "window", {
  value: { localStorage: fakeLocalStorage },
  configurable: true,
});

const purgeCount = purgeLegacyPrivateAccountLocalStorage();
check("runtime:purge-count", purgeCount === LEGACY_PRIVATE_ACCOUNT_STORAGE_KEYS.length, purgeCount);
check("runtime:purge-all-known-keys", removed.length === LEGACY_PRIVATE_ACCOUNT_STORAGE_KEYS.length, removed.length);
check("runtime:purge-does-not-read", getCalls === 0, getCalls);
check("runtime:purge-does-not-write", setCalls === 0, setCalls);

let notifications = 0;
const unsubscribe = subscribePrivateAccountTabStore(() => { notifications += 1; });
const key = "velmere:pass4555:account-download-access-capsule";
const sourceRow = { status: "client-fallback", nested: { value: 1 } };
writePrivateAccountTabArray(key, [sourceRow]);
const firstRead = readPrivateAccountTabArray<typeof sourceRow>(key);
firstRead[0].nested.value = 99;
const secondRead = readPrivateAccountTabArray<typeof sourceRow>(key);
check("runtime:write-read", secondRead.length === 1 && secondRead[0].status === "client-fallback");
check("runtime:defensive-clone", secondRead[0].nested.value === 1, secondRead[0].nested.value);
check("runtime:write-notifies", notifications === 1, notifications);
const snapshotBeforeClear = getPrivateAccountTabStoreSnapshot();
clearPrivateAccountTabStore([key]);
const snapshotAfterClear = getPrivateAccountTabStoreSnapshot();
check("runtime:clear", readPrivateAccountTabArray(key).length === 0);
check("runtime:clear-notifies", notifications === 2, notifications);
check("runtime:snapshot-changes", snapshotBeforeClear !== snapshotAfterClear);
unsubscribe();
writePrivateAccountTabArray(key, [{ status: "blocked" }]);
check("runtime:unsubscribe", notifications === 2, notifications);
clearPrivateAccountTabStore();

const failed = results.filter((row) => !row.passed);
const receipt = {
  status: failed.length
    ? "FAIL_A102R6_PRIVATE_ACCOUNT_BROWSER_STATE_BOUNDARY"
    : "PASS_A102R6_PRIVATE_ACCOUNT_EPHEMERAL_SERVER_CONFIRMED_BOUNDARY_NO_PROMOTION",
  assertions: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  results,
  truth: {
    browserPersistentPrivateAccountStateAuthority: false,
    browserCrossTabPrivateAccountStateAuthority: false,
    clientFallbackVaultReadyAuthority: false,
    serverConfirmationRequiredForDurableVault: true,
    liveCredit: false,
    saleCredit: false,
  },
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exitCode = 1;
