import fs from "node:fs";
import { execFileSync } from "node:child_process";

const checks = [];
function pass(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}
function read(file) { return fs.readFileSync(file, "utf8"); }

const pkg = JSON.parse(read("package.json"));
const tsconfig = JSON.parse(read("tsconfig.json"));
const includes = tsconfig.include ?? [];
const excludes = tsconfig.exclude ?? [];
const includeText = includes.join("\n");
const excludeText = excludes.join("\n");

pass("PASS994 verifier is registered", pkg.scripts?.["verify:pass994-1013-typecheck-scope"] === "node scripts/verify-pass994-1013-typecheck-scope.mjs");
pass("Production typecheck includes app source", includeText.includes("app/**/*.tsx") && includeText.includes("app/**/*.ts"));
pass("Production typecheck includes shared components", includeText.includes("components/**/*.tsx") && includeText.includes("components/**/*.ts"));
pass("Production typecheck includes runtime libraries", includeText.includes("lib/**/*.ts") && includeText.includes("store/**/*.ts"));
pass("Production typecheck excludes Playwright tests", excludeText.includes("tests/**") && excludeText.includes("**/*.spec.ts"));
pass("Production typecheck excludes scripts lane", excludeText.includes("scripts/**"));
pass("Production typecheck excludes handoff docs", excludeText.includes("docs/**") && excludeText.includes("**/*.ts.txt"));
pass("Production typecheck excludes legacy editing maps", excludeText.includes("EDITING_MAP/**") && excludeText.includes("RELEASE_PROOF_PASS641/**"));

const cartStore = read("store/useCartStore.ts");
pass("Cart store exports CartState for typed selectors", cartStore.includes("export type CartState"));
pass("Cart store hydrate callback is typed", cartStore.includes("onRehydrateStorage: () => (state: CartState | undefined)"));
pass("Cart store mutation callbacks are typed", cartStore.includes("(state: CartState)") && cartStore.includes("(entry: CartItem)"));

const cartProvider = read("components/CartProvider.tsx");
pass("Cart provider selectors are typed", cartProvider.includes("type CartState") && cartProvider.includes("useCartStore((state: CartState)"));
pass("Cart provider reducers are typed", cartProvider.includes("reduce((sum: number, item: CartItem)"));

const audioStore = read("store/useAudioStore.ts");
const audioToggle = read("components/ui/AudioToggleButton.tsx");
const uiSounds = read("lib/audio/useUiSounds.ts");
pass("Audio store exports AudioState", audioStore.includes("export type AudioState"));
pass("Audio selectors are typed", audioToggle.includes("type AudioState") && uiSounds.includes("type AudioState"));

const claimFirewall = read("lib/ai/vlm-claim-firewall.ts");
pass("VLM claim firewall maps are typed", claimFirewall.includes("type VlmFinding") && claimFirewall.includes("type VlmContradiction") && claimFirewall.includes("sourceId: string"));

const dataBackbone = read("lib/market-integrity/data-backbone.ts");
pass("Data backbone zod transforms are typed", dataBackbone.includes("transform((value: string)"));
pass("Data backbone issue maps are typed", dataBackbone.includes("message: string"));

const brain = read("lib/ai/vlm-brain.ts");
pass("VLM brain schema issue maps are typed", brain.includes("issue: { path: Array<string | number>"));
pass("VLM brain confidence governor still clamps fallback", brain.includes("Math.min(packet.confidenceCap, 39)") && brain.includes("providerError"));

for (const file of ["app/api/profile/route.ts", "app/api/square/comments/route.ts", "app/api/square/posts/route.ts"]) {
  const source = read(file);
  pass(`${file} handles unknown catch safely`, source.includes("catch (error: unknown)") && source.includes("flatten: () => unknown"));
}

const stripeClient = read("lib/stripe/client.ts");
pass("Stripe browser client uses inferred loadStripe return type", stripeClient.includes("type StripeClient = Awaited<ReturnType<typeof loadStripe>>") && !stripeClient.includes("type Stripe }"));

try {
  const output = execFileSync("npm", ["run", "vercel:preflight"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  pass("vercel:preflight still passes", output.includes("Velmère preflight OK"), output.trim().split("\n").at(-1));
} catch (error) {
  pass("vercel:preflight still passes", false, error instanceof Error ? error.message : String(error));
}

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`PASS994-1013 typecheck scope failed: ${failed.length}/${checks.length} checks failed.`);
  process.exit(1);
}
console.log(`PASS994-1013 typecheck scope: ${checks.length}/${checks.length} checks passed.`);
