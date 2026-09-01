#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  ROUTE_HASH_MAX_LENGTH,
  ROUTE_HASH_TARGET_WAIT_MS,
  ROUTE_PREFETCH_CACHE_LIMIT,
  classifyRouteTransitionHash,
  decodeRouteTransitionHash,
  isRouteTransitionSelfTarget,
  rememberBoundedRoutePrefetchKey,
} from "../../lib/ui/route-transition-policy.ts";

const checks = [];
const check = (id, fn) => { fn(); checks.push(id); };

check("hash-none", () => assert.deepEqual(classifyRouteTransitionHash(null), { kind: "none", value: null }));
check("hash-empty-invalid", () => assert.deepEqual(classifyRouteTransitionHash("#"), { kind: "invalid", value: null }));
check("hash-malformed-invalid", () => assert.equal(classifyRouteTransitionHash("#%E0%A4%A").kind, "invalid"));
check("hash-control-invalid", () => assert.equal(classifyRouteTransitionHash("#abc%0Adef").kind, "invalid"));
check("hash-oversized-invalid", () => assert.equal(classifyRouteTransitionHash(`#${"a".repeat(ROUTE_HASH_MAX_LENGTH + 1)}`).kind, "invalid"));
check("hash-valid-decoded", () => assert.deepEqual(classifyRouteTransitionHash("#risk%20engine"), { kind: "valid", value: "risk engine" }));
check("decode-backward-compatible", () => assert.equal(decodeRouteTransitionHash("#risk%20engine"), "risk engine"));
check("decode-invalid-null", () => assert.equal(decodeRouteTransitionHash("#%E0%A4%A"), null));
check("hash-wait-integer", () => assert.equal(Number.isInteger(ROUTE_HASH_TARGET_WAIT_MS), true));
check("hash-wait-positive", () => assert.equal(ROUTE_HASH_TARGET_WAIT_MS > 0, true));
check("hash-wait-bounded", () => assert.equal(ROUTE_HASH_TARGET_WAIT_MS <= 2_000, true));
check("hash-wait-below-safety", () => assert.equal(ROUTE_HASH_TARGET_WAIT_MS < 30_000, true));

const cache = new Set();
for (let index = 0; index < ROUTE_PREFETCH_CACHE_LIMIT + 5; index += 1) {
  assert.equal(rememberBoundedRoutePrefetchKey(cache, `/r32-${index}`), true);
}
check("prefetch-cache-limit", () => assert.equal(cache.size, ROUTE_PREFETCH_CACHE_LIMIT));
check("prefetch-cache-oldest-removed", () => assert.equal(cache.has("/r32-0"), false));
check("prefetch-cache-newest-retained", () => assert.equal(cache.has(`/r32-${ROUTE_PREFETCH_CACHE_LIMIT + 4}`), true));
check("prefetch-cache-duplicate-noop", () => assert.equal(rememberBoundedRoutePrefetchKey(cache, `/r32-${ROUTE_PREFETCH_CACHE_LIMIT + 4}`), false));
check("target-self-empty", () => assert.equal(isRouteTransitionSelfTarget(null), true));
check("target-self", () => assert.equal(isRouteTransitionSelfTarget("_self"), true));
check("target-blank-not-self", () => assert.equal(isRouteTransitionSelfTarget("_blank"), false));

const component = fs.readFileSync("components/ui/VelmereRouteTransition.tsx", "utf8");
check("component-imports-hash-classifier", () => assert.match(component, /classifyRouteTransitionHash/u));
check("component-imports-hash-wait", () => assert.match(component, /ROUTE_HASH_TARGET_WAIT_MS/u));
check("component-tracks-hash-missing-start", () => assert.match(component, /hashMissingSince/u));
check("component-bounds-missing-target", () => assert.match(component, /hashWaitExpired[\s\S]*ROUTE_HASH_TARGET_WAIT_MS/u));
check("component-invalid-hash-ready", () => assert.match(component, /hashClassification\.kind !== "valid" \|\| Boolean\(hashTarget\) \|\| hashWaitExpired/u));
check("component-fallback-scroll-top", () => assert.match(component, /hashClassification\.kind !== "none"[\s\S]*window\.scrollTo\(0, 0\)/u));
check("component-fallback-focus-main", () => assert.match(component, /document\.getElementById\("main-content"\)[\s\S]*focusRouteDestination\(main\)/u));
check("component-valid-target-scroll", () => assert.match(component, /hashTarget\.scrollIntoView/u));
check("component-valid-target-focus", () => assert.match(component, /focusRouteDestination\(hashTarget\)/u));
check("component-same-anchor-intent-not-restarted", () => assert.match(component, /intentPrefetchAnchor\.current === anchor[\s\S]*intentPrefetchTimer\.current !== null/u));
check("component-internal-child-intent-ignored", () => assert.match(component, /event\.relatedTarget instanceof Node[\s\S]*anchor\.contains\(event\.relatedTarget\)/u));
check("component-no-route-transition-not-prefetched", () => assert.match(component, /anchor\.dataset\.noRouteTransition === "true"/u));
check("component-pointer-intent-listener", () => assert.match(component, /addEventListener\("pointerover", onIntent/u));
check("component-focus-intent-listener", () => assert.match(component, /addEventListener\("focusin", onIntent/u));
check("component-cancels-pointer-departure", () => assert.match(component, /addEventListener\("pointerout", onPointerOut/u));
check("component-cancels-focus-departure", () => assert.match(component, /addEventListener\("focusout", onFocusOut/u));
check("component-global-safety-remains", () => assert.match(component, /ROUTE_TRANSITION_SAFETY_MS = 30_000/u));
check("visual-veil-still-aria-hidden", () => assert.match(component, /className="velmere-route-transition-veil"[\s\S]*aria-hidden="true"/u));
check("screen-reader-status-remains", () => assert.match(component, /role="status"[\s\S]*aria-live="polite"/u));

const result = {
  schemaVersion: "velmere.pass36.a102r32.route-hash-timeout-prefetch-reentry-test.v1",
  status: "PASS_A102R32_ROUTE_HASH_TIMEOUT_PREFETCH_REENTRY_LOCAL_ONLY",
  checks: checks.length,
  hashTargetWaitMs: ROUTE_HASH_TARGET_WAIT_MS,
  invalidHashBlocksTransition: false,
  missingHashTargetMaximumWaitMs: ROUTE_HASH_TARGET_WAIT_MS,
  sameAnchorIntentRestarted: false,
  noRouteTransitionPrefetched: false,
  realBrowserRows: 0,
  exactBuildBrowserCredit: false,
  promotion: { globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false },
};
console.log(JSON.stringify(result, null, 2));
