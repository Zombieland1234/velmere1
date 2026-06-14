# Velmère PASS161 — Runtime TDZ + Evidence Report Build Fix

## Fixed
- Runtime crash on Shield open: `Cannot access findLocalSuggestions before initialization`.
- Vercel build error: `InvestigatorProtocol` passed to `buildEvidenceReportDraft` where `ShieldOperatorCaseFile` was expected.

## How
- Shield suggestions effect no longer references `findLocalSuggestions` in the dependency array before the const initializer.
- `buildShieldEvidenceReportDraft` now accepts both `ShieldOperatorCaseFile` and `InvestigatorProtocol` and normalizes investigator output internally.
- Added `verify:pass161-runtime-build` guard.

## Files touched
- `components/market-integrity/MarketIntegrityClient.tsx`
- `lib/market-integrity/evidence-report.ts`
- `scripts/verify-pass161-runtime-build-safety.mjs`
- `package.json`
