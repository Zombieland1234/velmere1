import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const methodology = fs.readFileSync(
  path.join(root, "docs/authority/VELMERE_METODOLOGIA_FINISHOWANIA_CANONICAL_V11_PAID_READINESS_2026-08-13.txt"),
  "utf8",
);
const policy = JSON.parse(
  fs.readFileSync(path.join(root, "config/closure/p33/paid-readiness-policy.json"), "utf8"),
) as {
  schemaVersion: string;
  axes: Array<{ id: string; requiredForGoPaid: boolean }>;
  states: string[];
  nonAliasing: string[];
};
const builder = fs.readFileSync(
  path.join(root, "scripts/closure/build-p33-paid-readiness.py"),
  "utf8",
);
const verifier = fs.readFileSync(
  path.join(root, "scripts/closure/verify-p33-paid-readiness.py"),
  "utf8",
);

let assertions = 0;
function check(value: unknown, message: string) {
  assertions += 1;
  assert.ok(value, message);
}

check(methodology.includes("M23 — PAID READINESS DECOMPOSITION"), "methodology must include M23");
check(methodology.includes("Wzrost GO_INTERNAL nie podnosi automatycznie GO_PAID"), "internal progress must not alias to paid readiness");
check(methodology.includes("PASS_INTERNAL"), "methodology must distinguish internal proof");
check(methodology.includes("PASS_RELEASE"), "methodology must distinguish release proof");
check(policy.schemaVersion === "velmere.p33.paid-readiness-policy.v1", "policy schema must be pinned");
check(policy.axes.length === 12, "paid denominator must contain exactly 12 axes");
check(new Set(policy.axes.map((axis) => axis.id)).size === 12, "paid axes must be unique");
check(policy.axes.every((axis) => axis.requiredForGoPaid === true), "all frozen paid axes must remain mandatory");
check(policy.states.includes("EXTERNAL_OPEN"), "external-open state must remain explicit");
check(policy.nonAliasing.length >= 6, "policy must retain the non-aliasing contract");
check(builder.includes("stripe_binding.get(\"sourceManifestSha256\") == source_manifest_sha"), "local Stripe credit must be current-source bound");
check(builder.includes('"goPaidAllowed": release_ready'), "builder must derive GO_PAID from release states");
check(verifier.includes("provider_rights_false_promotion"), "verifier must reject false provider-rights promotion");
check(verifier.includes("local_stripe_aliased_to_release"), "verifier must reject local Stripe as release credit");
check(verifier.includes("tier_value_false_promotion"), "verifier must reject paid value without final holdouts");
check(verifier.includes("sale_enabled_must_remain_false"), "verifier must keep sale fail-closed");

console.log(`Paid readiness decomposition: PASS (${assertions}/${assertions})`);
