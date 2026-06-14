# Velmère PASS531–551 — implementation report

## Scope

This package continues from PASS530 and upgrades the chart, VLM AI Brain, PDF Reader/Forge, Shield Map, motion runtime and mobile release harness.

## PASS531–537

- Secondary candle feed overlay uses exact timestamp matches only.
- Secondary data uses an isolated price scale or a normalized index when quote bases are not directly comparable.
- Provider retry/backoff events are retained as an operator-visible history.
- PDF PL/DE typesetting audit distinguishes prose from identifiers and long addresses.
- AI evidence nodes carry stable source IDs, timestamps and freshness state.
- Shield evidence capsules carry stable attachment IDs and explicit `linked`, `partial` or `unlinked` state.
- Mobile Playwright coverage was added for Pixel and iPhone viewports.
- Node 20 route/source-budget smoke contract was added.

## PASS538–544

- Provider consensus quality combines route state, matched candle coverage, divergence, direction agreement, freshness and retry health.
- PDF page rhythm audits each of the four A4 pages separately.
- AI source trust matrix evaluates each provider separately instead of presenting one opaque percentage.
- Shield Focus Lens joins queue priority, evidence state and capsule completeness.
- Motion control exposes `full`, `efficient` and `still` modes and preserves functional transitions.
- Playwright runner leases a free port and no longer collides with abandoned dev servers.

## PASS545–551

### Provider consensus explainability

The chart now explains the consensus score through visible factors:

- timestamp coverage,
- median close divergence,
- direction agreement,
- freshness delta,
- provider route confidence cap.

The UI clearly distinguishes verified consensus, monitored consensus, single-source mode and blocked mode. It never upgrades a single feed into a cross-provider claim.

### AI remediation plan

The VLM Brain produces an ordered repair plan based on:

- contradiction root cause,
- weakest source trust entries,
- missing timestamps,
- unresolved contradictory edges.

Each repair step includes severity, action and expected evidence-quality effect. It does not promise an automatic confidence increase.

### PDF visual release audit

Reader and downloadable PDF checks are combined into one release audit using:

- preview/download scorecard,
- integrity seal,
- typography QA,
- four-page rhythm audit.

Each page exposes its own density state, and the final status is `release`, `review` or `blocked`.

### Shield temporal replay

Shield Map exposes a four-step evidence path:

1. observation,
2. comparison,
3. verification,
4. source/attachment linkage.

The replay shows the nearest missing step and never invents chronology when timestamps are absent.

### Interaction budget

Shield exposes an adaptive interaction budget:

- input latency target,
- maximum concurrent ambient loops,
- maximum blur budget,
- parallax and spring permissions.

Decorative effects are reduced first; keyboard navigation, focus visibility and functional state changes remain available.

### Playwright environment gate

The mobile runner now checks the Chromium executable before starting Next.js. Missing browser binaries produce an immediate exit code `2` with an installation command instead of leaving a dev server running until timeout.

## Additional blocker fixed

`tsconfig.pass537.json` existed but `package.json` did not expose `typecheck:pass537`. The missing script was added, restoring a consistent target-typecheck pipeline.

## Validation

- PASS480–551 verifier chain: PASS
- Target TypeScript PASS537: PASS
- Target TypeScript PASS544: PASS
- Target TypeScript PASS551: PASS
- ESLint for changed surfaces: PASS
- PL / DE / EN check: PASS
- Vercel preflight: PASS, 850 scanned files
- TypeScript parser: PASS, 851 TS/TSX files, 0 syntax diagnostics
- Node 20 production contract: PASS
- Node 20 route smoke: PASS
- ZIP integrity and exclusions: checked during packaging

## Environment boundary

The sandbox runtime is Node.js 22.16.0 while the project production contract is Node.js 20.x.

The Playwright Chromium package could not be downloaded because the sandbox DNS could not resolve the official CDN hosts. The new runner correctly fails fast. Pixel/iPhone browser execution must be completed in an environment where `npx playwright install chromium` succeeds.

A full repository-wide `tsc --noEmit` was started separately. Targeted semantic typechecks and the complete syntax parser passed; the full run is reported separately in build notes.
