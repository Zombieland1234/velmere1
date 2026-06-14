import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok, detail });

const unified = read('components/market-integrity/UnifiedAssetAnalysisControls.tsx');
const cross = read('components/market-integrity/CrossAssetCollapseRadarPanel.tsx');
const token = read('components/market-integrity/TokenRiskModal.tsx');
const overlay = read('components/ui/OverlayPrimitives.tsx');
const css = read('app/globals.css');
const cart = read('components/CartDrawer.tsx');
const pkg = JSON.parse(read('package.json'));

add('Unified shell exposes analysisOverlaySlot', /analysisOverlaySlot\?: ReactNode/.test(unified) && /data-unified-asset-analysis-overlay/.test(unified));
add('Real Markets renders VLM stage inside unified shell overlay', /analysisOverlaySlot=\{\s*auditMode \?/.test(cross) && /onClose=\{\(\) => setAuditMode\(null\)\}/.test(cross));
add('Real Markets old pre-shell audit render removed', !/\{auditMode \? \(\s*<VlmNeuralAuditExperience[\s\S]{0,260}<UnifiedAssetModalShell/.test(cross));
add('Shield renders VLM stage inside unified shell overlay', /analysisOverlaySlot=\{\s*vlmSequenceMode \?/.test(token) && /completeVlmAiSequence\(vlmSequenceMode\)/.test(token));
add('Shield old sibling audit render removed', !/\{vlmSequenceMode \? \(\s*<VlmNeuralAuditExperience[\s\S]{0,260}<div\s+ref=\{modalShellRef\}/.test(token));
add('DropdownRoot computes immediate fallback position', /const resolvedPosition = useMemo/.test(overlay) && /resolveDropdownPosition\(anchor, align, width, offset\)/.test(overlay) && /resolveFallbackDropdownPosition\(align, width\)/.test(overlay));
add('DropdownRoot focuses first menu item after open', /querySelector<HTMLElement>\(\s*"button:not\(\[disabled\]\),\[href\]/.test(overlay) && /first\?\.focus\(\{ preventScroll: true \}\)/.test(overlay));
add('Language dropdown forced visible over header/backdrop', /\[data-surface="language-selector-anchored"\][\s\S]{0,180}z-index: 1250/.test(css));
add('Cart drawer remains bottom motion preset', /motionPreset="bottom"/.test(cart) && /velmere-cart-bottom-sheet/.test(cart));
add('Cart bottom sheet owns high runtime layer', /\[data-surface="cart-bottom-sheet"\][\s\S]{0,120}z-index: 1400/.test(css));
add('Circular chart orbit still active', /data-unified-asset-circular-chart="true"/.test(unified) && /\.unified-asset-chart-orb/.test(css));
add('Messenger bubble dock still active', /data-unified-asset-bubble-dock="true"/.test(unified) && /velmere-bubble-arrive/.test(css));
add('Embedded neural audit no longer behaves as full viewport fixed overlay', /\.unified-asset-analysis-overlay \.velmere-neural-audit-root[\s\S]{0,220}position: relative !important/.test(css));
add('Reduced motion is preserved for bubble flow', /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,160}unified-asset-bubble-button/.test(css));
add('Package exposes this verifier', pkg.scripts['verify:pass1074-1093-modal-runtime-followup'] === 'node scripts/verify-pass1074-1093-modal-runtime-followup.mjs');

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}${check.detail ? ` — ${check.detail}` : ''}`);
}
if (failed.length) {
  console.error(`\nPASS1074-1093 verifier failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nPASS1074-1093 verifier passed: ${checks.length}/${checks.length}`);
