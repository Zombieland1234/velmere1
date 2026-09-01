import fs from "node:fs";
import {
  buildMetaMaskMobileDappDeeplink,
  buildPhantomMobileBrowserDeeplink,
  buildSafeMobileWalletDappUrl,
  consumePendingMobileWallet,
  openMetaMaskMobileDapp,
  openPhantomMobileBrowser,
  setPendingMobileWallet,
} from "../../lib/wallet/mobile-deeplinks.ts";

const results: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
function check(id: string, passed: unknown, detail?: unknown) {
  results.push({ id, passed: Boolean(passed), detail });
}
function rejects(id: string, action: () => unknown) {
  try {
    action();
    check(id, false, "accepted");
  } catch (error) {
    check(id, true, error instanceof Error ? error.message : String(error));
  }
}

const source = fs.readFileSync("lib/wallet/mobile-deeplinks.ts", "utf8");
check("source:no-location-search", !source.includes("window.location.search"));
check("source:no-location-hash", !source.includes("window.location.hash"));
check("source:no-location-href", !source.includes("window.location.href"));
check("source:dedicated-boundary-id", source.includes("PASS36_A102R7_MOBILE_WALLET_DEEPLINK_BOUNDARY_ID"));
check("source:public-path-allowlist", source.includes("SAFE_PUBLIC_WALLET_PATHS"));
check("source:credentials-rejected", source.includes("url.username || url.password"));

check(
  "safe:market-path",
  buildSafeMobileWalletDappUrl({ origin: "https://velmere.example", pathname: "/pl/market-integrity" })
    === "https://velmere.example/pl/market-integrity",
);
check(
  "safe:shield-pro-path",
  buildSafeMobileWalletDappUrl({ origin: "https://velmere.example", pathname: "/de/shield-pro" })
    === "https://velmere.example/de/shield-pro",
);
check(
  "safe:root-locale",
  buildSafeMobileWalletDappUrl({ origin: "https://velmere.example", pathname: "/en" })
    === "https://velmere.example/en",
);
check(
  "private:account-collapses-to-locale",
  buildSafeMobileWalletDappUrl({ origin: "https://velmere.example", pathname: "/pl/account" })
    === "https://velmere.example/pl",
);
check(
  "private:checkout-collapses-to-locale",
  buildSafeMobileWalletDappUrl({ origin: "https://velmere.example", pathname: "/de/checkout/success" })
    === "https://velmere.example/de",
);
check(
  "private:dynamic-report-collapses-to-locale",
  buildSafeMobileWalletDappUrl({ origin: "https://velmere.example", pathname: "/en/market-integrity/report-secret" })
    === "https://velmere.example/en",
);
check(
  "query-in-path-rejected-to-root",
  buildSafeMobileWalletDappUrl({ origin: "https://velmere.example", pathname: "/pl/market-integrity?code=secret" })
    === "https://velmere.example/en",
);
check(
  "fragment-in-path-rejected-to-root",
  buildSafeMobileWalletDappUrl({ origin: "https://velmere.example", pathname: "/pl/search#session-secret" })
    === "https://velmere.example/en",
);
check(
  "scheme-relative-rejected-to-root",
  buildSafeMobileWalletDappUrl({ origin: "https://velmere.example", pathname: "//attacker.example/pl" })
    === "https://velmere.example/en",
);
check(
  "backslash-rejected-to-root",
  buildSafeMobileWalletDappUrl({ origin: "https://velmere.example", pathname: "/pl\\account" })
    === "https://velmere.example/en",
);
check(
  "encoded-slash-rejected-to-root",
  buildSafeMobileWalletDappUrl({ origin: "https://velmere.example", pathname: "/pl%2faccount" })
    === "https://velmere.example/en",
);
check(
  "control-rejected-to-root",
  buildSafeMobileWalletDappUrl({ origin: "https://velmere.example", pathname: "/pl/search\nsecret" })
    === "https://velmere.example/en",
);
check(
  "unknown-locale-rejected-to-en",
  buildSafeMobileWalletDappUrl({ origin: "https://velmere.example", pathname: "/fr/search" })
    === "https://velmere.example/en",
);
check(
  "local-http-allowed",
  buildSafeMobileWalletDappUrl({ origin: "http://127.0.0.1:3000", pathname: "/pl/search" })
    === "http://127.0.0.1:3000/pl/search",
);

rejects("origin:http-remote-rejected", () => buildSafeMobileWalletDappUrl({ origin: "http://velmere.example", pathname: "/pl" }));
rejects("origin:credentials-rejected", () => buildSafeMobileWalletDappUrl({ origin: "https://user:pass@velmere.example", pathname: "/pl" }));
rejects("origin:path-rejected", () => buildSafeMobileWalletDappUrl({ origin: "https://velmere.example/private", pathname: "/pl" }));
rejects("origin:query-rejected", () => buildSafeMobileWalletDappUrl({ origin: "https://velmere.example?secret=1", pathname: "/pl" }));
rejects("origin:fragment-rejected", () => buildSafeMobileWalletDappUrl({ origin: "https://velmere.example#secret", pathname: "/pl" }));
rejects("origin:remote-port-rejected", () => buildSafeMobileWalletDappUrl({ origin: "https://velmere.example:444", pathname: "/pl" }));
rejects("origin:javascript-rejected", () => buildSafeMobileWalletDappUrl({ origin: "javascript:alert(1)", pathname: "/pl" }));

const metamask = buildMetaMaskMobileDappDeeplink({
  origin: "https://velmere.example",
  pathname: "/pl/account?code=oauth-secret#fragment-secret",
});
check("metamask:provider-origin", metamask.startsWith("https://link.metamask.io/dapp/"), metamask);
check("metamask:no-secret-query-or-fragment", !metamask.includes("oauth-secret") && !metamask.includes("fragment-secret") && !metamask.includes("?"), metamask);
check("metamask:private-path-collapsed", metamask === "https://link.metamask.io/dapp/velmere.example/en", metamask);

const phantom = buildPhantomMobileBrowserDeeplink({
  origin: "https://velmere.example",
  pathname: "/de/market-integrity",
});
const phantomUrl = new URL(phantom);
const phantomTarget = decodeURIComponent(phantomUrl.pathname.replace("/ul/browse/", ""));
check("phantom:provider-origin", phantomUrl.origin === "https://phantom.app", phantomUrl.origin);
check("phantom:safe-target", phantomTarget === "https://velmere.example/de/market-integrity", phantomTarget);
check("phantom:ref-origin-only", decodeURIComponent(phantomUrl.searchParams.get("ref") ?? "") === "https://velmere.example");
check("phantom:no-sensitive-state", !phantom.includes("code=") && !phantom.includes("session") && !phantom.includes("#"), phantom);

const storage = new Map<string, string>();
const assigned: string[] = [];
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    location: {
      origin: "https://velmere.example",
      pathname: "/pl/account/private-report-id",
      search: "?code=oauth-secret&session_id=checkout-secret",
      hash: "#private-fragment",
      assign(value: string) { assigned.push(value); },
    },
    sessionStorage: {
      setItem(key: string, value: string) { storage.set(key, value); },
      getItem(key: string) { return storage.get(key) ?? null; },
      removeItem(key: string) { storage.delete(key); },
    },
  },
});

openMetaMaskMobileDapp();
check("runtime:metamask-assign-once", assigned.length === 1, assigned);
check("runtime:metamask-no-query-hash-leak", !assigned[0].includes("oauth-secret") && !assigned[0].includes("checkout-secret") && !assigned[0].includes("private-fragment"), assigned[0]);
check("runtime:metamask-private-path-collapsed", assigned[0] === "https://link.metamask.io/dapp/velmere.example/pl", assigned[0]);
check("runtime:pending-metamask-consume", consumePendingMobileWallet() === "metamask");
check("runtime:pending-consumed-once", consumePendingMobileWallet() === null);

openPhantomMobileBrowser();
check("runtime:phantom-assign-twice", assigned.length === 2, assigned);
check("runtime:phantom-no-query-hash-leak", !assigned[1].includes("oauth-secret") && !assigned[1].includes("checkout-secret") && !assigned[1].includes("private-fragment"), assigned[1]);
check("runtime:pending-phantom-consume", consumePendingMobileWallet() === "phantom");
setPendingMobileWallet("metamask");
storage.set("velmere:pending-mobile-wallet", "attacker");
check("runtime:unknown-pending-rejected", consumePendingMobileWallet() === null);

const failed = results.filter((row) => !row.passed);
const receipt = {
  status: failed.length
    ? "FAIL_A102R7_MOBILE_WALLET_DEEPLINK_PRIVACY_BOUNDARY"
    : "PASS_A102R7_MOBILE_WALLET_DEEPLINK_QUERY_HASH_PRIVATE_PATH_FAIL_CLOSED_NO_PROMOTION",
  assertions: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  results,
  truth: {
    walletProviderReceivesCurrentQuery: false,
    walletProviderReceivesCurrentFragment: false,
    walletProviderReceivesPrivateDynamicPath: false,
    walletProviderReceivesOnlyValidatedOriginAndAllowlistedPublicPath: true,
    liveCredit: false,
    saleCredit: false,
  },
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exitCode = 1;
