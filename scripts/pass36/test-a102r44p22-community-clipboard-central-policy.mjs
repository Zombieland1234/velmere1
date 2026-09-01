#!/usr/bin/env node
import fs from "node:fs";
import {
  MAX_PUBLIC_SYSTEM_CLIPBOARD_TEXT_BYTES,
  buildSafePublicSquarePostClipboardUrl,
  copyPublicCommunityText,
  serializeSafePublicSystemClipboardText,
} from "../../lib/security/browser-system-clipboard";

const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
const rejected = (id, action, marker) => {
  let message = "";
  try { action(); } catch (error) { message = String(error); }
  add(id, message.includes(marker), message.slice(0, 240));
};

const clipboardSource = fs.readFileSync("lib/security/browser-system-clipboard.ts", "utf8");
const policySource = fs.readFileSync("lib/security/control-character-policy.ts", "utf8");
add("central-policy-imported", clipboardSource.includes('from "@/lib/security/control-character-policy"'));
add("central-policy-called", (clipboardSource.match(/containsUnsafeControlOrBidi\(/gu) ?? []).length >= 2);
add("central-bidi-range", policySource.includes("codePoint >= 0x202a") && policySource.includes("codePoint <= 0x202e"));
add("central-isolate-range", policySource.includes("codePoint >= 0x2066") && policySource.includes("codePoint <= 0x2069"));
add("plain-normalized", serializeSafePublicSystemClipboardText("  Velmère community  ") === "Velmère community");
rejected("nul-rejected", () => serializeSafePublicSystemClipboardText("safe\u0000hidden"), "system_clipboard_public_text_invalid");
rejected("bidi-rejected", () => serializeSafePublicSystemClipboardText("safe\u202ehidden"), "system_clipboard_public_text_invalid");
rejected("c1-control-rejected", () => serializeSafePublicSystemClipboardText("safe\u0085hidden"), "system_clipboard_public_text_invalid");
rejected("oversize-rejected", () => serializeSafePublicSystemClipboardText("x".repeat(MAX_PUBLIC_SYSTEM_CLIPBOARD_TEXT_BYTES + 1)), "system_clipboard_public_payload_out_of_bounds");
add("canonical-url", buildSafePublicSquarePostClipboardUrl({ origin: "https://velmere.example", locale: "de", slug: "post-7" }) === "https://velmere.example/de/square#post-7");

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const originalSecure = Object.getOwnPropertyDescriptor(globalThis, "isSecureContext");
const writes = [];
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { clipboard: { writeText: async (value) => writes.push(value) } } });
Object.defineProperty(globalThis, "isSecureContext", { configurable: true, value: true });
add("community-write", await copyPublicCommunityText("public body") === true && writes.at(-1) === "public body");
Object.defineProperty(globalThis, "isSecureContext", { configurable: true, value: false });
const before = writes.length;
add("insecure-context-blocked", await copyPublicCommunityText("blocked") === false && writes.length === before);
if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator); else Reflect.deleteProperty(globalThis, "navigator");
if (originalSecure) Object.defineProperty(globalThis, "isSecureContext", originalSecure); else Reflect.deleteProperty(globalThis, "isSecureContext");

add("single-sink", (clipboardSource.match(/navigator\.clipboard\.writeText/gu) ?? []).length === 1);
add("legacy-marker-not-required", !policySource.includes("PUBLIC_TEXT_FORBIDDEN"));

const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p22.community-clipboard-central-policy-test.v1",
  status: failed.length ? "FAIL" : "PASS",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  rows: checks,
  truthBoundary: { clipboardAuthority: false, exactBrowserCredit: false, stagingCredit: false, liveCredit: false, saleCredit: false },
}, null, 2));
process.exit(failed.length ? 1 : 0);
