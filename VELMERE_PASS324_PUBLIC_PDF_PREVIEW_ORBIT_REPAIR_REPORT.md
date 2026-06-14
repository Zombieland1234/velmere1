# PASS324 — Public PDF Preview + Orbit Scroll Repair Gate

## Scope
PASS324 answers the current public-UX blockers:

- Homepage must not render internal customer-focus / concierge proof cues.
- VLM Browser search must lead to a branded PDF preview modal, not directly dump the full Shield analysis.
- Suggestions must stay above the surface and not hide under cards.
- Orbit 360 tile detail must slide from the right and remain wheel/touch scrollable.
- Social-Exchange / PASS294-PASS313 operator sync rails must not be visible on the public Shield terminal.

## New UI innovation
**Ghost-Signed PDF Atelier Modal**

Public flow:

1. Search token / contract / topic.
2. See compact capsule.
3. Branded Velmère Cybersecurity PDF preview opens in a centered modal.
4. User can close by outside click or X.
5. User can download/open preview.
6. Full Shield remains a secondary review path.

## Key files changed

- `components/search/VelmereIntelligenceSearchClient.tsx`
- `components/market-integrity/TokenRiskModal.tsx`
- `components/home/HomePageClient.tsx`
- `app/globals.css`
- `lib/market-integrity/public-pdf-preview-orbit-repair-gate.ts`
- `scripts/verify-pass324-public-pdf-preview-orbit-repair-gate-safety.mjs`
- `package.json`

## Public cleanup

- Removed the homepage public proof-concierge stack.
- Replaced the VLM Browser primary result action with PDF preview.
- Added a branded modal sheet with Velmère Cybersecurity signature placeholder.
- Kept the full Shield handoff as secondary after review.
- Hid public Social-Exchange / PASS sync rails via CSS guard.

## Orbit 360 fix

- Added `shield-vlm-detail-panel-pass324` class to selected tile portal panel.
- Added wheel/touch propagation isolation without preventing default scroll.
- Added right-edge slide animation.
- Forced max-height and overflow-y auto with overscroll containment.
- Added mobile bottom-sheet fallback.

## Safety boundary

- PDF preview is a research note, not a safety certificate.
- No buy/sell command.
- No guaranteed safety, solvency, ROI, or investment wording.
- Source/proof internals stay behind operator rails.

## Verification

Passed:

```txt
PASS324 Public PDF Preview + Orbit Scroll Repair Gate verified.
i18n ok across 3 locale files
Velmère preflight OK · next 14.2.35 · scanned 645 files
```

Known inherited blocker:

```txt
typecheck still fails on old missing dependencies/types: next, react, node, lucide-react, next-intl, stripe, wagmi, zustand, tailwindcss, plus legacy props issues.
```
