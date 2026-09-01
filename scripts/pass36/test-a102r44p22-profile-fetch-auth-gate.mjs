#!/usr/bin/env node
import fs from "node:fs";

const hook = fs.readFileSync("lib/hooks/useProfile.ts", "utf8");
const navbar = fs.readFileSync("components/Navbar.tsx", "utf8");
const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });

add("key:disabled-null", hook.includes('return enabled ? "/api/profile" : null;'));
add("key:enabled-exact", hook.includes('profileRequestKey(enabled)'));
add("hook:default-explicit", hook.includes("enabled = true"));
add("navbar:auth-ready-and-authenticated", navbar.includes("authReady && authenticated"));
add("navbar:no-unconditional-one-arg-call", !navbar.includes("useProfile(fallbackProfile);"));
add("fetch:no-store-retained", hook.includes('{ cache: "no-store" }'));
add("read:bounded-retained", hook.includes("256 * 1024"));
add("patch:explicit-retained", hook.includes('method: "PATCH"'));

const failed = checks.filter((row) => !row.passed);
const result = {
  schemaVersion: "velmere.pass36.a102r44p22.profile-fetch-auth-gate.v1",
  status: failed.length ? "FAIL" : "PASS",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  rows: checks,
};
console.log(JSON.stringify(result, null, 2));
process.exit(failed.length ? 1 : 0);
