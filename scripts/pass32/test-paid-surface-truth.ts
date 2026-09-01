import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(path: string) {
  return readFileSync(`${process.cwd()}/${path}`, "utf8");
}

const lens = source("components/search/VelmereIntelligenceSearchClient.tsx");
const paidPdfProductMappings = lens.match(
  /depth === "pro"\s*\?\s*"vlm_pro_pdf_single"\s*:\s*"vlm_advanced_pdf_single"/g,
) ?? [];
assert.ok(
  paidPdfProductMappings.length >= 2,
  "Both the paid UI gate and checkout path must map Pro/Advanced depth to their exact PDF product IDs",
);
assert.match(lens, /readVlmPaidAccessToken\(paidProductId, paidContext\)/);
assert.match(lens, /startVlmServiceCheckout\([\s\S]*productId: paidProductId/);

const angel = source("components/angel/AngelPanel.tsx");
assert.match(angel, /depth:\s*"basic"/);

const shieldMap = source("components/market-integrity/ShieldMapCommandClient.tsx");
assert.match(shieldMap, /<VlmBrainWorkspace[\s\S]{0,500}depth="basic"/);
assert.doesNotMatch(shieldMap, /depth=\{showDeepDive \? "advanced" : "basic"\}/);

console.log("PASS Lens Pro and Advanced PDF choices both use product-bound checkout tokens");
console.log("PASS Angel and Shield Map do not relabel an unentitled fallback as paid depth");
