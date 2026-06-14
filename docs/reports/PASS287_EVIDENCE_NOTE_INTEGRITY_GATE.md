# PASS287 — Evidence Note Integrity Gate

Scope: M03 Evidence Note, M05 redacted payload export, K05 privacy redaction, K04 storage boundary, K07 retention policy, D17 missing-data semantics.

## Runtime hotfix

Fixed the live Next.js runtime crash reported in `TokenRiskModal.tsx`: `downloadEvidenceManifest is not defined`.

The manifest buttons now have real client handlers:

- `downloadEvidenceManifest` creates a JSON Blob, clicks a temporary anchor and revokes the object URL.
- `copyEvidenceManifest` uses `navigator.clipboard.writeText` with a textarea fallback.
- `evidenceExportNotice` supports idle / copied / downloaded / failed states.

## Product delta

PASS287 adds the Evidence Note Mirror / Velvet Note Seal. Short evidence notes are allowed only when claims are bounded, source gaps stay visible, raw payloads are redacted, storage is not faked, and retention policy is clear.

## Safety copy

No trade-direction prompts, ROI copy, guarantees, safety certificates, accusations or raw wallet/IP exposure are allowed.
