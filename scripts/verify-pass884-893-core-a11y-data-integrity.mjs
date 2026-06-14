#!/usr/bin/env node
import { readFileSync } from "node:fs";

const checks = [];
const read = (path) => readFileSync(path, "utf8");
const assert = (name, ok, detail = "") => checks.push({ name, ok: Boolean(ok), detail });

const pkg = JSON.parse(read("package.json"));
const focus = read("components/ui/useDialogFocusBoundary.ts");
const scroll = read("components/ui/useModalScrollLock.ts");
const shell = read("components/market-integrity/UnifiedAssetAnalysisControls.tsx");
const shield = read("components/market-integrity/TokenRiskModal.tsx");
const brain = read("components/market-integrity/VlmBrainWorkspace.tsx");
const lens = read("components/search/VelmereIntelligenceSearchClient.tsx");
const wallet = read("components/wallet/WalletConnectOptions.tsx");
const en = JSON.stringify(JSON.parse(read("messages/en.json")));
const pl = JSON.stringify(JSON.parse(read("messages/pl.json")));
const de = JSON.stringify(JSON.parse(read("messages/de.json")));

assert("package exposes PASS884-893 verifier", pkg.scripts?.["verify:pass884-893-core-a11y-data-integrity"] === "node scripts/verify-pass884-893-core-a11y-data-integrity.mjs");
assert("package has npm overrides for React/Web3 matrix", pkg.overrides?.react === "$react" && pkg.overrides?.wagmi === "$wagmi" && pkg.overrides?.viem === "$viem" && pkg.overrides?.["@wagmi/core"] === "2.22.1" && pkg.overrides?.["@wagmi/connectors"] === "6.2.0");
assert("package has resolutions mirror for Gemini/CI scanners", pkg.resolutions?.react === "19.2.7" && pkg.resolutions?.wagmi === "2.19.5" && pkg.resolutions?.viem === "2.52.2");

assert("focus boundary uses React layout timing", focus.includes("useLayoutEffect") && focus.includes("captureFocusSnapshot"));
assert("focus boundary restores remounted trigger", focus.includes("MutationObserver") && focus.includes("resolveFocusSnapshot") && focus.includes("data-testid"));
assert("focus boundary traps Tab and handles Escape", focus.includes('event.key === "Escape"') && focus.includes('event.key !== "Tab"') && focus.includes("closeRef.current"));
assert("focus boundary supports outside backdrop close", focus.includes("closeOnOutsidePointerDown") && focus.includes("pointerdown") && focus.includes("root.contains(event.target)"));
assert("Shield modal uses shared focus boundary", shield.includes("useDialogFocusBoundary") && shield.includes("closeDialogBoundary") && shield.includes("initialFocus: closeButtonRef") && shield.includes("closeOnOutsidePointerDown: true"));
assert("shared shell exposes close button ref", shell.includes("closeButtonRef?: Ref<HTMLButtonElement>") && shell.includes("ref={closeButtonRef}"));

assert("scroll lock sets body touchAction none", scroll.includes('body.style.touchAction = "none"'));
assert("scroll lock has iOS boundary normalization", scroll.includes("normalizeIOSScrollBoundary") && scroll.includes("touchRegion") && scroll.includes("event.preventDefault()"));
assert("scroll lock keeps inner modal scroll region", scroll.includes('data-modal-scroll-region="true"') || scroll.includes("closestScrollRegion"));

assert("VLM Brain has tiered phases", brain.includes('type LoadingPhase = "idle" | "boot" | "orb" | "brain"') && brain.includes("PHASE_MINIMUM_MS = 800"));
assert("VLM Brain has depth minimum UX durations", brain.includes("DEPTH_MINIMUM_MS") && brain.includes("basic: 2600") && brain.includes("advanced: 7200"));
assert("VLM Brain applies 25 percent confidence penalty", brain.includes("applyClientConfidencePenalty") && brain.includes("sourceCount") && brain.includes("missingData") && brain.includes("originalConfidence * 0.75"));
assert("VLM Brain exposes fallback data state in UI", brain.includes("Fallback Data") && brain.includes("data-confidence-penalty") && brain.includes("clientGovernor"));

assert("Lens toolbar has spatial navigation handler", lens.includes("handlePreviewToolbarKeyDown") && lens.includes('event.key !== "ArrowLeft" && event.key !== "ArrowRight"'));
assert("Lens toolbar loops focus across buttons", lens.includes("(currentIndex + direction + controls.length) % controls.length") && lens.includes("focus({ preventScroll: true })"));
assert("Lens Escape remains mapped to closePreview", lens.includes('event.key === "Escape"') && lens.includes("closePreview();") && lens.includes("onKeyDown={handlePreviewToolbarKeyDown}"));
assert("Lens single result pipeline remains capped", lens.includes("return exact ? [exact] : items.slice(0, 1)"));

assert("Wallet copy shows read-only/no seed before choices", wallet.includes("Velmère never asks for seed phrases or private keys") && wallet.includes("Velmère nigdy nie prosi o seed phrase ani klucz prywatny") && wallet.includes("data-pass634-wallet-consent-boundary"));
assert("I18N removes direct profit promise copy", !en.includes("does not promise profit") && !pl.includes("obietnica zysku") && !de.includes("does not promise profit"));
assert("I18N replaces generic secure checkout claims", en.includes("Protected payment") && pl.includes("Chroniona płatność") && de.includes("Geschützte Zahlung"));
assert("I18N has neutral language markers", en.includes("Neutral language") && pl.includes("Neutralny język"));

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
}
if (failed.length) {
  console.error(`PASS884-893 verifier failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS884-893 verifier passed: ${checks.length}/${checks.length}`);
