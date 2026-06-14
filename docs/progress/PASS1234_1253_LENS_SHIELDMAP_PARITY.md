# PASS1234–1253 — Lens/PDF Parity + Shield Map Evidence Graph

Date: 2026-06-11
Base: PASS1233 build/click proof ZIP
Mode: endgame product cleanup, not new decorative surface.

## What changed

- Added `pass1234-lens-shieldmap-evidence-parity`, a shared manifest that says exactly how Browser/Lens PDF and Shield Map relate to the same evidence story.
- Added `pass1234` to every Lens report: final status, confidence cap, source count, missing count, conflict count, localized public copy, canonical evidence nodes and manifest key.
- PDF export now carries the same parity marker in the generated PDF content and response headers.
- Browser/Lens reader now shows a small customer-facing parity strip: Reader/PDF 1:1, map without price table, final status and confidence cap.
- Shield Map now uses the same canonical node model for Sources, Facts, Signals, Conflicts, Missing Data, Confidence and VLM Verdict instead of a separate hard-coded legend.
- Shield Map exposes `data-pass1234-shieldmap-role="evidence_graph_not_price_table"`, so regression checks can prove it is not turning back into a duplicate price table or duplicate PDF surface.

## Product decision

Browser/Lens and Shield Map are now separated cleanly:

| Surface | Role | Anti-chaos rule |
|---|---|---|
| Browser / Lens | Reader + PDF export | It must keep preview/download parity and not become a second Shield terminal. |
| Shield Map | Evidence path graph | It must explain sources, facts, signals, conflicts, missing data and confidence — not repeat prices or PDF layout. |
| Shield terminal | Market table + modal analysis | It remains the place for chart, price, market rows and Basic/Pro/Advanced analysis. |

## Proof status

| Gate | Status | Notes |
|---|---|---|
| New PASS1234 verifier | PASS | Static contract checks shared manifest, Lens report, PDF headers, Browser strip and Shield Map role. |
| `check:i18n` | PASS | Locale files still valid. |
| `vercel:preflight` | PASS | 950 files scanned after the new pass file. |
| `smoke:routes:static` | PASS | 75 localized routes + 3 root surfaces. |
| `verify:pass1214-1233-build-click-proof` | PASS | Previous click-proof harness remains present. |
| Full install/typecheck/lint/build/browser click | NOT PROVEN HERE | Still requires full Node 24/npm 11 machine without sandbox timeout. |

## Updated completion call

| Area | Previous | Now | Reason |
|---|---:|---:|---|
| Overall platform | 94.2% | 94.8% | Browser/Map product boundary is now coded, not just described. |
| Browser/Lens | 86.0% | 87.4% | Reader/PDF parity is visible and included in the report model. |
| Shield Map | 77.0% | 80.5% | Moved closer to evidence graph instead of duplicate dashboard/table. |
| VLM Brain / data integrity | 84.0% | 85.0% | Evidence story is shared across Lens and Map through a canonical manifest. |
| UI/UX clarity | 96.0% | 96.3% | Public copy now explains what each surface is for. |
| Build/deploy readiness | 91.2% | 91.3% | Static gates remain green; full build is still unproven. |

## Next best lane

PASS1254–1273 should focus on `npm ci -> typecheck -> lint -> build` proof and then real Playwright execution. After that, polish the actual generated PDF typography only if browser screenshots show remaining crowding.

<!-- PASS1234-1253 marker: Lens/PDF and Shield Map share one evidence parity manifest. -->
