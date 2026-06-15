import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const fail = (message) => {
  console.error(`PASS2032 verifier failed: ${message}`);
  process.exit(1);
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const shieldMap = read("components/market-integrity/ShieldMapClient.tsx");
const tokenModal = read("components/market-integrity/TokenRiskModal.tsx");
const dataBackbone = read("lib/market-integrity/data-backbone.ts");
const pkg = JSON.parse(read("package.json"));

assert(shieldMap.includes("type Pass1354Locale"), "ShieldMapClient must import the strict Pass1354Locale type.");
assert(shieldMap.includes("const pass1354Locale: Pass1354Locale"), "ShieldMapClient must normalize next-intl locale before PASS1354.");
assert(!shieldMap.includes('data-pass314-shield-map-simplified="true"'), "ShieldMapClient must not keep the dead duplicated second return tree.");
assert(shieldMap.includes("shield-map-unified-search-shell"), "ShieldMapClient must keep PASS267 unified search marker after cleanup.");
assert(shieldMap.includes("shield-map-token-suggest-panel"), "ShieldMapClient must keep Shield Map suggestion marker after cleanup.");
assert(shieldMap.includes('role="listbox"'), "ShieldMapClient must keep a listbox marker for suggestion a11y/preflight.");
assert(!/investigatorResult!|evidenceReport!|sourceSnapshot!|handoffPacket!|investigatorSuggestFrame!/.test(shieldMap), "ShieldMapClient must not rely on non-null assertions for nullable investigation state.");
assert(!/encodeURIComponent\(handoffQuery\)/.test(shieldMap), "handoffQuery must be coalesced before encodeURIComponent.");
assert(tokenModal.includes("const modalShellRef = useRef<HTMLDivElement | null>(null)"), "TokenRiskModal modal shell ref must be HTMLDivElement.");
assert(!tokenModal.includes("RefObject<HTMLElement | null>"), "TokenRiskModal must not leak HTMLElement refs into div refs.");
assert(dataBackbone.includes("value: string | undefined"), "data-backbone URL transforms must accept undefined from optional zod branches.");
assert(!dataBackbone.includes("transform((value: string) => value || undefined)"), "data-backbone must not use narrow string-only empty URL transforms.");
assert(pkg.scripts?.typecheck === "tsc --noEmit", "typecheck must stay active for Vercel.");

console.log("PASS2032 verifier OK · Vercel-ahead static blockers swept");
