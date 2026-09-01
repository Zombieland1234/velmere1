#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  ROUTE_HASH_MAX_LENGTH,
  ROUTE_PREFETCH_CACHE_LIMIT,
  decodeRouteTransitionHash,
  isRouteTransitionSelfTarget,
  rememberBoundedRoutePrefetchKey,
} from "../../lib/ui/route-transition-policy.ts";

const checks = [];
const check = (id, fn) => {
  fn();
  checks.push(id);
};

check("self-target-empty", () => assert.equal(isRouteTransitionSelfTarget(null), true));
check("self-target-explicit", () => assert.equal(isRouteTransitionSelfTarget("_self"), true));
check("self-target-case-whitespace", () => assert.equal(isRouteTransitionSelfTarget("  _SELF "), true));
for (const target of ["_blank", "_parent", "_top", "named-frame"]) {
  check(`non-self-target-${target}`, () => assert.equal(isRouteTransitionSelfTarget(target), false));
}

check("hash-decodes", () => assert.equal(decodeRouteTransitionHash("#risk%20engine"), "risk engine"));
check("hash-no-prefix", () => assert.equal(decodeRouteTransitionHash("section"), "section"));
check("hash-empty-rejected", () => assert.equal(decodeRouteTransitionHash("#"), null));
check("hash-malformed-rejected", () => assert.equal(decodeRouteTransitionHash("#%E0%A4%A"), null));
check("hash-control-rejected", () => assert.equal(decodeRouteTransitionHash("#abc%0Adef"), null));
check("hash-oversized-rejected", () => assert.equal(decodeRouteTransitionHash(`#${"a".repeat(ROUTE_HASH_MAX_LENGTH + 1)}`), null));

const cache = new Set();
for (let index = 0; index < ROUTE_PREFETCH_CACHE_LIMIT + 12; index += 1) {
  assert.equal(rememberBoundedRoutePrefetchKey(cache, `/route-${index}`), true);
}
check("prefetch-cache-bounded", () => assert.equal(cache.size, ROUTE_PREFETCH_CACHE_LIMIT));
check("prefetch-cache-evicts-oldest", () => {
  assert.equal(cache.has("/route-0"), false);
  assert.equal(cache.has(`/route-${ROUTE_PREFETCH_CACHE_LIMIT + 11}`), true);
});
check("prefetch-cache-duplicate-noop", () => assert.equal(rememberBoundedRoutePrefetchKey(cache, `/route-${ROUTE_PREFETCH_CACHE_LIMIT + 11}`), false));
check("prefetch-invalid-limit-noop", () => assert.equal(rememberBoundedRoutePrefetchKey(new Set(), "/x", 0), false));

const component = fs.readFileSync("components/ui/VelmereRouteTransition.tsx", "utf8");
check("component-uses-bounded-prefetch", () => assert.match(component, /rememberBoundedRoutePrefetchKey\(prefetchedRoutes\.current, key\)/u));
check("component-cancels-pointer-intent", () => assert.match(component, /addEventListener\("pointerout", onPointerOut/u));
check("component-cancels-focus-intent", () => assert.match(component, /addEventListener\("focusout", onFocusOut/u));
check("component-waits-for-hash-target", () => assert.match(component, /hashTargetReady/u));
check("component-scrolls-hash-before-hide", () => assert.match(component, /hashTarget\.scrollIntoView/u));
check("component-focuses-destination", () => assert.match(component, /focusRouteDestination\(hashTarget\)/u));
check("component-focuses-main", () => assert.match(component, /focusRouteDestination\(main\)/u));
check("component-controls-scroll", () => assert.match(component, /router\.push\(destinationPath, \{ scroll: false \}\)/u));
check("component-announces-status", () => {
  assert.match(component, /role="status"/u);
  assert.match(component, /aria-live="polite"/u);
});
check("component-only-self-target", () => assert.match(component, /isRouteTransitionSelfTarget\(anchor\.getAttribute\("target"\)\)/u));
check("visual-veil-remains-hidden-from-at", () => assert.match(component, /className="velmere-route-transition-veil"[\s\S]*?aria-hidden="true"/u));
check("no-direct-unbounded-set-add", () => assert.doesNotMatch(component, /prefetchedRoutes\.current\.add\(/u));

const result = {
  schemaVersion: "velmere.pass36.a102r31.route-transition-boundary-test.v1",
  status: "PASS_A102R31_ROUTE_TRANSITION_HASH_FOCUS_PREFETCH_ACCESSIBILITY_LOCAL_ONLY",
  checks: checks.length,
  prefetchCacheLimit: ROUTE_PREFETCH_CACHE_LIMIT,
  crossRouteHashFocusBound: true,
  nonHashMainFocusBound: true,
  pointerIntentCancellationBound: true,
  screenReaderStatusBound: true,
  realBrowserRows: 0,
  exactBuildBrowserCredit: false,
  promotion: { globalDecision: "NO_GO", live: false, saleEnabled: false },
};
console.log(JSON.stringify(result, null, 2));
