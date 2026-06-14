# Velmère PASS469 — A4 layout audit, download receipt and Shield AI acknowledgement

## Scope
PASS469 continues from PASS468 and focuses on the parts that can still fail after the Browser result is correct: the binary A4 layout, mobile PDF controls, download-event truthfulness and target-side acknowledgement of the Browser handoff.

The pass does not treat a click as proof that the operating system saved a file. It records only `download_initiated`, which is the event the application can truthfully observe.

## Implemented

### Audited A4 layout
A new `pass469-a4-layout-v1` contract defines every drawable region on all four A4 pages. It reserves a footer-safe zone and rejects:
- a panel entering the footer;
- negative panel height;
- vertical overlap between panels on the same page;
- content positioned above the page content ceiling.

The binary PDF route now consumes these coordinates instead of repeating independent magic numbers.

### Text-density and long-token repair
The PDF writer now:
- derives the number of body lines from the actual panel height;
- uses smaller controlled typography for dense panels;
- hard-wraps long strings such as URLs, addresses and checksums;
- limits title density and compacts long source labels;
- keeps page number, signature and payload metadata inside the reserved footer.

### Basic / Pro / Advanced page structures
The layout is tier-aware:
- Basic and Pro receive a large selected-tier evidence region;
- Advanced retains separate Basic, Pro and Advanced evidence structures;
- page four uses different safe regions for Advanced versus Basic/Pro;
- confidence waterfall and next-action panels remain separated from the footer.

### Responsive PDF toolbar
The preview toolbar uses a compact grid on narrow screens and a flex layout on wider screens. Reader/PDF toggle, Shield, Orbit, download and close remain available without expanding the document width.

### Download receipt
PASS469 adds a private local receipt containing:
- receipt id and creation timestamp;
- filename, symbol and selected PDF tier;
- report checksum;
- source confidence and source count;
- `containsRawPayload: false`;
- deterministic checksum.

Tampered receipts are rejected during read. The UI displays the receipt only when persistence succeeds. The receipt confirms initiation, not final operating-system save completion.

### Shield AI handoff acknowledgement
The Shield AI panel receives the already validated PASS468 context and confirms it only when the normalized packet symbol matches the freshly scanned Shield result. The message explicitly states that:
- instrument context was received;
- Shield completed its own scan;
- the packet is display-only context and does not replace the Shield result.

### Browser test scenario
An optional Playwright script checks:
1. deterministic ETH search;
2. Advanced selection in the four-stage forge;
3. PDF preview visibility;
4. mobile toolbar viewport fit;
5. no horizontal document overflow;
6. background scroll lock;
7. browser download event and selected-tier filename;
8. private download receipt;
9. scroll-lock release after close.

## Validation executed

```text
PASS453–PASS469 regression gates ✅
PASS469 layout semantics for Basic/Pro/Advanced ✅
PASS469 receipt round-trip and tamper rejection ✅
Full application syntax sweep — 772 TS/TSX ✅
i18n PL/DE/EN ✅
Vercel preflight — 777 scanned files ✅
```

## Not executed
- Full `next build`: the working package does not contain installed `node_modules`.
- Playwright/Chromium: the executable scenario is included, but browser dependencies are not installed in this sandbox.
- Live provider smoke: deployment networking and provider secrets are still required where applicable.

## Recommended next pass
PASS470 should execute screenshot-based Basic/Pro/Advanced PDF comparisons in Chromium, add keyboard-only modal QA, expose a small privacy-safe receipt history and continue the runtime crash sweep across Real Markets, Shield and Orbit.
