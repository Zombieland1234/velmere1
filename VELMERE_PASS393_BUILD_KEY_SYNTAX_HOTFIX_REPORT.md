# PASS393 — Build Key Syntax Hotfix

## Problem
Next.js build failed in `lib/market-integrity/pass392-public-fidelity-core.ts` because FX symbols such as `EUR/TRY`, `USD/TRY`, `USD/ZAR`, `EUR/ZAR`, `USD/MXN`, and `EUR/MXN` were used as unquoted object keys.

JavaScript/TypeScript treats `/` as an operator, so keys containing `/` must be quoted inside object literals.

## Fix
- Quoted PASS392 FX object keys.
- Swept older Real Markets pass files for the same pattern: PASS387, PASS388, PASS389, PASS390, PASS391.
- Quoted stock/exchange symbols containing dots, for example `ADS.DE`, `RMS.PA`, `ADYEN.AS`, `LSEG.L`, `SIE.DE`.
- Added a verifier to block this class of error before the next ZIP.

## Guard
`npm run verify:pass393-build-key-syntax-hotfix`

The guard checks:
- no unquoted slash/dot market keys remain in the recent pass files;
- PASS392 contains quoted FX keys;
- accidental text corruption such as `"marketRows.length"` is not present.

## Result
This is a focused build unblocker. It does not change product behavior; it fixes syntax so Next.js can compile the affected files.
