import fs from "node:fs";
import path from "node:path";
import {
  buildPass468HandoffHref,
  buildPass468HandoffPacket,
  purgeLegacyPass468HandoffStorage,
  readPass468HandoffPacket,
  writePass468HandoffPacket,
} from "../../lib/market-integrity/browser-shield-orbit-handoff";
import type { VelmereSearchResult } from "../../lib/search/intelligence-search-contract";

const root = process.cwd();
let passed = 0;
const failures: string[] = [];
function check(name: string, condition: unknown) {
  if (condition) passed += 1;
  else failures.push(name);
}
function source(relative: string) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return Array.from(this.values.keys())[index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "window", {
  value: { sessionStorage: storage },
  configurable: true,
});

const result = {
  id: "bitcoin",
  title: "Private user note customer@example.com ?token=secret",
  symbol: "BTC",
  category: "token",
  tone: "review",
  sourceMode: "provider",
  sourceConfidence: 92,
  sources: [{ label: "Private provider account 123", url: "https://provider.example/private" }],
  missingData: ["private analyst note"],
  marketSnapshot: {
    price: 123456,
    marketCap: 999999,
    volume24h: 555555,
    observedAt: "2026-07-30T08:00:00.000Z",
  },
} as unknown as VelmereSearchResult;

const packet = buildPass468HandoffPacket(result, "advanced", "shield");
const packetText = JSON.stringify(packet);
check("version-v2", packet.version === "browser-shield-orbit-handoff-v2");
check("canonical-asset", packet.assetKey === "BTC");
check("target-shield", packet.target === "shield");
check("fresh-scan-required", packet.requiresFreshTargetScan === true);
check("display-only", packet.trustedForDisplayOnly === true);
check("no-browser-persistence", packet.browserPersistenceAllowed === false);
check("no-customer-query-flag", packet.containsCustomerQuery === false);
check("no-tier-flag", packet.containsTier === false);
check("no-source-claims-flag", packet.containsSourceClaims === false);
check("packet-no-title", !packetText.includes("Private user note"));
check("packet-no-email", !packetText.includes("customer@example.com"));
check("packet-no-token", !packetText.includes("token=secret"));
check("packet-no-provider", !packetText.includes("provider.example"));
check("packet-no-depth", !packetText.includes("advanced"));
check("packet-no-snapshot", !packetText.includes("123456"));

const shieldHref = buildPass468HandoffHref("pl", packet);
check("shield-route", shieldHref.startsWith("/pl/market-integrity?"));
check("shield-asset-only", shieldHref.includes("asset=BTC"));
check("shield-from", shieldHref.includes("from=velmere-browser"));
check("shield-view", shieldHref.includes("view=full"));
check("href-no-query-param", !/[?&]query=/u.test(shieldHref));
check("href-no-depth", !/[?&]depth=/u.test(shieldHref));
check("href-no-packet", !/[?&]packet=/u.test(shieldHref));
check("href-no-handoff", !/[?&]handoff=/u.test(shieldHref));
check("href-no-source", !/[?&]source=/u.test(shieldHref));
check("href-no-private-copy", !shieldHref.includes("customer") && !shieldHref.includes("secret"));

const orbitPacket = buildPass468HandoffPacket(result, "pro", "orbit");
const orbitHref = buildPass468HandoffHref("de", orbitPacket);
check("orbit-route", orbitHref.startsWith("/de/shield-map?"));
check("orbit-view", orbitHref.includes("view=orbit"));
check("orbit-no-tier", !orbitHref.includes("pro"));

const evm = buildPass468HandoffPacket({ ...result, symbol: "", id: "0x1234567890abcdef1234567890abcdef12345678" } as unknown as VelmereSearchResult, "basic", "shield");
check("evm-address-allowed", evm.assetKey === "0x1234567890abcdef1234567890abcdef12345678");
const unsafe = buildPass468HandoffPacket({ ...result, symbol: "", id: "private search customer@example.com" } as unknown as VelmereSearchResult, "basic", "shield");
check("unsafe-id-dropped", unsafe.assetKey === null);
const unsafeHref = buildPass468HandoffHref("xx", unsafe);
check("unsafe-locale-fallback", unsafeHref.startsWith("/pl/market-integrity?"));
check("unsafe-no-asset", !/[?&]asset=/u.test(unsafeHref));

storage.setItem("velmere:pass468:handoff:latest", "private-packet-id");
storage.setItem("velmere:pass468:handoff:private-packet-id", JSON.stringify({ secret: "do-not-read" }));
storage.setItem("unrelated", "keep");
const removed = purgeLegacyPass468HandoffStorage();
check("legacy-two-removed", removed === 2);
check("legacy-latest-gone", storage.getItem("velmere:pass468:handoff:latest") === null);
check("legacy-packet-gone", storage.getItem("velmere:pass468:handoff:private-packet-id") === null);
check("unrelated-kept", storage.getItem("unrelated") === "keep");

storage.setItem("velmere:pass468:handoff:latest", "forged");
storage.setItem("velmere:pass468:handoff:forged", JSON.stringify({ version: "browser-shield-orbit-handoff-v1", checksum: "forged" }));
check("legacy-read-never-restores", readPass468HandoffPacket() === null);
check("legacy-read-purges", storage.getItem("velmere:pass468:handoff:forged") === null);
const beforeWrite = storage.length;
check("compat-write-safe", writePass468HandoffPacket(packet) === true);
check("compat-write-no-storage", storage.length === beforeWrite);

const handoffSource = source("lib/market-integrity/browser-shield-orbit-handoff.ts");
const clientSource = source("components/search/VelmereIntelligenceSearchClient.tsx");
check("source-no-session-set", !handoffSource.includes("sessionStorage.setItem"));
check("source-no-session-get", !handoffSource.includes("sessionStorage.getItem"));
check("source-no-json-parse", !handoffSource.includes("JSON.parse"));
check("source-no-query-param", !handoffSource.includes('params.set("query"'));
check("source-no-depth-param", !handoffSource.includes('params.set("depth"'));
check("source-no-packet-param", !handoffSource.includes('params.set("packet"'));
check("client-purges-legacy", clientSource.includes("purgeLegacyPass468HandoffStorage"));
check("client-no-write-import", !clientSource.includes("writePass468HandoffPacket"));

const output = {
  status: failures.length
    ? "FAIL_A102R14_BROWSER_SHIELD_HANDOFF_PRIVACY_BOUNDARY"
    : "PASS_A102R14_BROWSER_SHIELD_HANDOFF_PRIVACY_BOUNDARY_LOCAL_ONLY",
  passed,
  failed: failures.length,
  failures,
  truth: {
    sessionStorageAuthority: false,
    customerQueryInHandoff: false,
    tierInHandoff: false,
    sourceClaimsInHandoff: false,
    legacyValuesReadOrMigrated: false,
    freshTargetScanRequired: true,
    realBrowserMatrixProven: false,
    stagingProven: false,
    liveProven: false,
    saleEnabled: false,
  },
};
console.log(JSON.stringify(output, null, 2));
if (failures.length) process.exitCode = 1;
