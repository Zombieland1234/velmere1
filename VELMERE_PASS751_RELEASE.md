# Velmère PASS751 — unified VLM/UI release

## Delivered

- Canonical `velmere-vlm-brain-v3` runtime with Gemini structured JSON, source-bound confidence, retry/timeout/cache and deterministic fallback.
- Shared VLM Brain API and premium workspace in Shield and Shield Map.
- Shield table sorting moved into headers with three states: descending, ascending and neutral/default.
- 30-day sorting added; redundant sort dock and technical `open AI` labels removed.
- Chart wheel input remains local to the chart; modal layer order repaired.
- Real Markets Basic/Pro/Advanced controls expose the active state.
- VLM neural modal remains above competing overlays; inactive evidence-motion button removed.
- Slow continuous VLM orbit with reduced-motion support.
- Security CTA now routes to Velmère Shield.
- PL/EN/DE workspace labels and a complete responsive visual layer.

## Verification completed

- PASS726–733 viewport UI repair: 19/19.
- PASS746–751 unified VLM/UI release: 20/20.
- VLM Brain performance runtime: PASS.
- PASS602–606 neural topology release: PASS.
- i18n parity across PL/EN/DE: PASS.

## Verification limits

The repository declares Node `>=24.16.0 <25` and npm `>=11.16.0 <12`. The available release environment used Node 22/npm 10, while the local NVM catalogue could not install the repository-declared Node 24.16.0 runtime. Full `tsc --noEmit` did not report an error before exceeding the execution limit, but it did not complete. The production Next build and full ESLint gate must therefore be run on the declared Node/npm versions before deployment.

## Remaining path to complete AI integration

Real Markets still uses its established deterministic neural analysis rather than the canonical VLM fact packet. Lens/PDF still builds the report object client-side before server rendering. Live Gemini verification also requires a valid server-side API key and Vercel deployment smoke test.
