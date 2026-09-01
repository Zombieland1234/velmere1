import fs from "node:fs";
import path from "node:path";
import {
  MAX_PUBLIC_SYSTEM_CLIPBOARD_TEXT_BYTES,
  PASS36_A102R18_PUBLIC_CLIPBOARD_BOUNDARY_ID,
  buildSafePublicSquarePostClipboardUrl,
  copyPublicCommunityText,
  copyPublicSquarePostLink,
  serializeSafePublicSystemClipboardText,
  writeSafePublicSystemClipboardText,
} from "../../lib/security/browser-system-clipboard";

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
function rejected(name: string, action: () => unknown, marker: string) {
  let ok = false;
  try { action(); } catch (error) { ok = String(error).includes(marker); }
  check(name, ok);
}

check("boundary-id", PASS36_A102R18_PUBLIC_CLIPBOARD_BOUNDARY_ID.endsWith("public-community-system-clipboard-boundary.v1"));
check("public-budget", MAX_PUBLIC_SYSTEM_CLIPBOARD_TEXT_BYTES === 8 * 1024);
check("plain-text", serializeSafePublicSystemClipboardText("  public comment  ") === "public comment");
check("newline-normalized", serializeSafePublicSystemClipboardText("line 1\r\nline 2") === "line 1\nline 2");
check("unicode-text", serializeSafePublicSystemClipboardText("Velmère — öffentliche Notiz") === "Velmère — öffentliche Notiz");
rejected("empty-rejected", () => serializeSafePublicSystemClipboardText("   "), "system_clipboard_public_text_invalid");
rejected("non-string-rejected", () => serializeSafePublicSystemClipboardText({ body: "x" }), "system_clipboard_public_text_invalid");
rejected("control-rejected", () => serializeSafePublicSystemClipboardText("safe\u0000hidden"), "system_clipboard_public_text_invalid");
rejected("bidi-rejected", () => serializeSafePublicSystemClipboardText("safe\u202ehidden"), "system_clipboard_public_text_invalid");
rejected("oversize-rejected", () => serializeSafePublicSystemClipboardText("x".repeat(MAX_PUBLIC_SYSTEM_CLIPBOARD_TEXT_BYTES + 1)), "system_clipboard_public_payload_out_of_bounds");
rejected("budget-zero-rejected", () => serializeSafePublicSystemClipboardText("x", 0), "system_clipboard_public_budget_invalid");
rejected("budget-over-max-rejected", () => serializeSafePublicSystemClipboardText("x", MAX_PUBLIC_SYSTEM_CLIPBOARD_TEXT_BYTES + 1), "system_clipboard_public_budget_invalid");

const httpsLink = buildSafePublicSquarePostClipboardUrl({ origin: "https://velmere.example", locale: "pl", slug: "post-123" });
check("https-link", httpsLink === "https://velmere.example/pl/square#post-123");
const localLink = buildSafePublicSquarePostClipboardUrl({ origin: "http://127.0.0.1:3000", locale: "en", slug: "local-123" });
check("localhost-http", localLink === "http://127.0.0.1:3000/en/square#local-123");
check("de-locale", buildSafePublicSquarePostClipboardUrl({ origin: "https://velmere.example", locale: "de", slug: "official" }).includes("/de/square#official"));
rejected("remote-http-rejected", () => buildSafePublicSquarePostClipboardUrl({ origin: "http://velmere.example", locale: "pl", slug: "post-1" }), "system_clipboard_public_origin_invalid");
rejected("origin-path-rejected", () => buildSafePublicSquarePostClipboardUrl({ origin: "https://velmere.example/path", locale: "pl", slug: "post-1" }), "system_clipboard_public_origin_invalid");
rejected("origin-query-rejected", () => buildSafePublicSquarePostClipboardUrl({ origin: "https://velmere.example/?x=1", locale: "pl", slug: "post-1" }), "system_clipboard_public_origin_invalid");
rejected("origin-credentials-rejected", () => buildSafePublicSquarePostClipboardUrl({ origin: "https://user:pass@velmere.example", locale: "pl", slug: "post-1" }), "system_clipboard_public_origin_invalid");
rejected("locale-rejected", () => buildSafePublicSquarePostClipboardUrl({ origin: "https://velmere.example", locale: "fr", slug: "post-1" }), "system_clipboard_public_locale_invalid");
rejected("slug-empty-rejected", () => buildSafePublicSquarePostClipboardUrl({ origin: "https://velmere.example", locale: "pl", slug: "" }), "system_clipboard_public_slug_invalid");
rejected("slug-separator-rejected", () => buildSafePublicSquarePostClipboardUrl({ origin: "https://velmere.example", locale: "pl", slug: "../private" }), "system_clipboard_public_slug_invalid");
rejected("slug-bidi-rejected", () => buildSafePublicSquarePostClipboardUrl({ origin: "https://velmere.example", locale: "pl", slug: "post\u202e1" }), "system_clipboard_public_slug_invalid");
rejected("slug-oversize-rejected", () => buildSafePublicSquarePostClipboardUrl({ origin: "https://velmere.example", locale: "pl", slug: `p${"x".repeat(160)}` }), "system_clipboard_public_slug_invalid");

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const originalSecureContext = Object.getOwnPropertyDescriptor(globalThis, "isSecureContext");
const writes: string[] = [];
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { clipboard: { writeText: async (value: string) => { writes.push(value); } } },
});
Object.defineProperty(globalThis, "isSecureContext", { configurable: true, value: true });
check("public-write", await writeSafePublicSystemClipboardText("community text") === true);
check("public-write-value", writes.at(-1) === "community text");
check("community-copy", await copyPublicCommunityText("comment body") === true);
check("community-copy-value", writes.at(-1) === "comment body");
check("square-copy", await copyPublicSquarePostLink({ origin: "https://velmere.example", locale: "en", slug: "post-9" }) === true);
check("square-copy-value", writes.at(-1) === "https://velmere.example/en/square#post-9");
const writeCount = writes.length;
Object.defineProperty(globalThis, "isSecureContext", { configurable: true, value: false });
check("insecure-blocked", await writeSafePublicSystemClipboardText("blocked") === false);
check("insecure-no-write", writes.length === writeCount);
if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
else Reflect.deleteProperty(globalThis, "navigator");
if (originalSecureContext) Object.defineProperty(globalThis, "isSecureContext", originalSecureContext);
else Reflect.deleteProperty(globalThis, "isSecureContext");

const square = source("components/square/VelmereSquareClient.tsx");
const comments = source("components/community/CommentThread.tsx");
const clipboard = source("lib/security/browser-system-clipboard.ts");
check("square-central-link-builder", square.includes("buildSafePublicSquarePostClipboardUrl"));
check("square-central-copy", square.includes("copyPublicSquarePostLink"));
check("square-no-direct-clipboard", !square.includes("navigator.clipboard"));
check("comment-central-copy", comments.includes("copyPublicCommunityText(comment.body)"));
check("comment-no-direct-clipboard", !comments.includes("navigator.clipboard"));
check("single-browser-clipboard-sink", (clipboard.match(/navigator\.clipboard\.writeText/gu) ?? []).length === 1);
check("secure-context-required", clipboard.includes("globalThis.isSecureContext") && clipboard.includes("writeValidatedSystemClipboardText"));
check("control-bidi-policy", clipboard.includes("PUBLIC_TEXT_FORBIDDEN"));
check("canonical-square-policy", clipboard.includes("PUBLIC_SQUARE_SLUG") && clipboard.includes("PUBLIC_SQUARE_LOCALES"));

const directSinkFiles: string[] = [];
for (const base of ["app", "components", "lib"]) {
  const walk = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (/\.(?:ts|tsx|js|jsx|mjs)$/u.test(entry.name)) {
        const relative = path.relative(root, absolute).replaceAll(path.sep, "/");
        const text = fs.readFileSync(absolute, "utf8");
        if (text.includes("navigator.clipboard.writeText") && relative !== "lib/security/browser-system-clipboard.ts") directSinkFiles.push(relative);
      }
    }
  };
  walk(path.join(root, base));
}
check("no-direct-clipboard-sinks", directSinkFiles.length === 0);

const output = {
  status: failures.length
    ? "FAIL_A102R18_PUBLIC_COMMUNITY_SYSTEM_CLIPBOARD_BOUNDARY"
    : "PASS_A102R18_PUBLIC_COMMUNITY_SYSTEM_CLIPBOARD_BOUNDARY_LOCAL_ONLY",
  assertions: passed + failures.length,
  passed,
  failed: failures.length,
  failures,
  directSinkFiles,
  truth: {
    directPublicClipboardSinks: 0,
    secureContextRequired: true,
    publicTextByteLimit: MAX_PUBLIC_SYSTEM_CLIPBOARD_TEXT_BYTES,
    controlAndBidiRejected: true,
    squareLinksCanonicalSameOrigin: true,
    clipboardAuthority: false,
    realBrowserClipboardRows: 0,
    exactBrowserMatrixProven: false,
    stagingProven: false,
    liveProven: false,
    saleEnabled: false,
  },
};
console.log(JSON.stringify(output, null, 2));
if (failures.length) process.exitCode = 1;
