const fs = require('fs');

// 1. Patch vlm-advanced-only-access-policy.ts
const p1 = 'C:/Users/marci/Desktop/Nowy folder/lib/commerce/vlm-advanced-only-access-policy.ts';
if (fs.existsSync(p1)) {
  let c1 = fs.readFileSync(p1, 'utf8');
  c1 = c1.replace(
    'return verified;',
    'return true; // FREE ACCESS FOR TESTING ACROSS ALL TIERS'
  );
  c1 = c1.replace(
    'export function isVlmAdvancedPaidUnlocked(): boolean {',
    'export function isVlmAdvancedPaidUnlocked(): boolean {\n  return true; // FREE UNLOCKED'
  );
  fs.writeFileSync(p1, c1, 'utf8');
  console.log('Patched vlm-advanced-only-access-policy.ts for 100% free unlocked access!');
}

// 2. Patch AnalysisTab.tsx
const p2 = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/analysis/AnalysisTab.tsx';
if (fs.existsSync(p2)) {
  let c2 = fs.readFileSync(p2, 'utf8');
  c2 = c2.replace(
    'const isAdvancedLocked = !isAdvancedUnlocked;',
    'const isAdvancedLocked = false; // UNLOCKED ALL TIERS'
  );
  c2 = c2.replace(
    'const isProLocked = !isProUnlocked;',
    'const isProLocked = false; // UNLOCKED ALL TIERS'
  );
  fs.writeFileSync(p2, c2, 'utf8');
  console.log('Patched AnalysisTab.tsx for all tiers unlocked!');
}
