# Velmère PASS467 — Result Priority Runtime + Browser/PDF error sweep

## Scope
PASS467 continues from PASS466 and fixes the Browser hierarchy problem reported during live review: after committing a token or market search, the selected result was rendered below the large PDF capsule and analysis matrix. The result now becomes the immediate next surface under the sticky search bar, while the PDF capsule moves below it and changes its copy into a next-step prompt.

The pass also hardens the same runtime against stale requests, malformed provider payloads, unsafe symbol normalization, PDF tier race conditions and native-constructor collisions caused by icon imports.

## Implemented

### Result-first Browser hierarchy
- Search result cards are now before the PDF capsule in actual DOM order, not only through CSS visual ordering.
- Before a search, the PDF capsule remains the first useful onboarding surface under the search field.
- After a committed result, the hierarchy becomes:
  1. sticky search,
  2. committed result,
  3. result actions and evidence,
  4. PDF depth capsule,
  5. remaining Browser content.
- The first result receives a stronger visual boundary and a `data-primary-result` marker.
- The result rail uses a scroll margin that respects the sticky search bar.
- After the result is committed, the PDF capsule copy changes from “enter a token” to “choose the PDF depth”.

### Detail request race guard
- Added a dedicated `detailRequestRef` separate from suggestion requests.
- Starting a new committed search aborts the previous detail request.
- Old results are cleared immediately when the next committed scan begins.
- A late response cannot overwrite a newer query.
- Aborted requests do not show a false generic error.
- Active requests are aborted during component cleanup.

### Runtime payload normalization
- Added client-side normalization for result strings, arrays, source rows, confidence values and required fields.
- Malformed `chips`, `missingData` or `sources` payloads resolve to safe empty/source-required structures instead of crashing render paths.
- Duplicate client results are removed by category and symbol/id.
- Confidence values are clamped to 0–100.
- Missing titles, summaries, source modes and Shield paths receive conservative fallbacks.

### Real Markets catalog safety
- `pass466-real-market-lens.ts` now accepts unknown symbol input at the normalization boundary.
- Empty or invalid catalog symbols are filtered out before deduplication.
- Symbol glyph lookup uses one normalized value instead of repeating unsafe `.trim()` calls.

### PDF depth timing and modal correctness
- The PDF depth can be changed during identity and source collection.
- The selected tier is captured after the source stage, matching the interface copy.
- Basic/Pro/Advanced buttons become truly disabled after the lock point.
- The forge request has its own AbortController and stale requests cannot close a newer forge.
- The interactive forge overlay is now an `aria-modal` dialog.
- Initial focus moves to the selected depth button and Tab stays inside the forge dialog.

### Combobox semantics
- The search input now exposes combobox, list-autocomplete, expanded-state and controls semantics.
- The suggestion panel is a listbox and suggestions are options.
- Manual selection remains the source of the committed search.

### Constructor collision guard
- PASS467 verifier scans lucide-react imports for names that can shadow native constructors such as `Map`, `Set`, `URL`, `File` and `Image`.
- A risky icon must be aliased before the verifier passes.

## Validation

Passed in the sandbox:

```text
PASS453–PASS467 regression chain ✅
PASS467 result-priority/runtime guard ✅
779 TS/TSX parser sweep ✅
i18n PL/DE/EN ✅
Vercel preflight ✅ — 775 scanned files
native-constructor icon collision scan ✅
DOM order assertion: result before PDF capsule ✅
```

## Not executed
- Full `next build` was not run because the package does not contain `node_modules`.
- Chromium/Playwright was not available for a browser-level animation, scroll-lock and download test.
- Live provider responses still require deployment connectivity and configured production secrets where applicable.

## Recommended next pass
PASS468 should exercise the complete Browser journey in a real browser, add measured A4 overflow assertions and pass the selected Browser result packet directly into Shield/Orbit without repeating discovery.
