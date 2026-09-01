# PASS4403 TokenRiskModal build-pressure reduction

Scope: no visual changes. This pass removes unused legacy chart presentation helpers from the active `TokenRiskModal.tsx` bundle and moves the PASS462 venue-health normalizer into a typed library boundary.

Why: the Windows build log showed `TokenRiskModal.tsx` as a build-pressure monolith. PASS4403 reduces active component size without touching rendered class names, copy, modal behavior, paywall state, chart fetch state, or user-visible layout.

Preserved runtime boundaries:
- PASS462 venue-health JSON still flows through `normalizePass462ShieldVenuePayload(value: unknown)`.
- No raw provider payload or untyped `response.json()` is trusted directly.
- Public topka/LIVE claims remain fail-closed.
- Removed chart helpers were not referenced by the active modal JSX path in this repository snapshot.

Next extraction target if Windows build still OOMs: split terminal/AI panels into separate lazy view-model modules without visual edits.
