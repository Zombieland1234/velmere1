# PASS1977 — Broad interaction bug sweep

## Goal
Continue searching for mixed UI/runtime bugs beyond the header: dead buttons, click targets that appear active but do nothing, form semantics that can trigger accidental submits, and hidden interaction regressions that do not always fail the build.

## Fixed

1. `components/community/CommentThread.tsx`
   - Made the Square comment kebab menu real: it now opens, can copy comment text, and can close.
   - Added local like/dislike state with `aria-pressed` so reaction buttons are no longer dead UI.
   - Made reply buttons write a mention into the comment input, giving a visible user action.

2. `components/vlm/VlmBuyAccessPanel.tsx`
   - Fixed the VLM waitlist CTA. It now closes the access drawer and opens the existing private mail drawer through `velmere:open-mail`.

3. `components/vlm/VlmWalletModule.tsx`
   - Fixed a wallet CTA that could look clickable in the disconnected state but had no click behavior.
   - It now dispatches `velmere:open-wallet`, using the same wallet panel pathway as the header/command palette.

4. `components/lab/VelmereMotionLabClient.tsx`
   - Fixed the Motion Lab `Open concept` CTA.
   - The button now routes to the matching app area instead of being a static/dead button.

5. `components/ui/primitives.tsx`
   - Shared `Button` now defaults to `type="button"` to reduce accidental form submits across the app.
   - Shared `Input` keeps an explicit default `type="text"`.

6. `components/security/SecurityAuditRegistryPage.tsx`
   - Audit registry filter button now explicitly uses `type="submit"`, making the form behavior intentional.

## Verification

- `node scripts/verify-pass1977-broad-interaction-sweep.mjs` — PASS
- `node scripts/check-i18n.mjs` — PASS
- `node scripts/vercel-preflight.mjs` — PASS
- `node scripts/verify-pass1976-broad-bug-sweep.mjs` — PASS regression
- Alias import scan — 0 missing local `@/` imports

## Notes

The container still does not have project `node_modules`, so a full local `npm run build` was not executed here. Static verification, syntax transpile checks for changed TSX files, i18n, preflight, alias imports, and PASS1976 regression checks all pass.
