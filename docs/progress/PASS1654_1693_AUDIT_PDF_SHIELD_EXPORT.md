# PASS1654–1693 Audit PDF + Shield Map Export

Goal: deepen Audit Watch so a queue record generates a full report payload for Lens PDF/export and Shield Map, not only a public status manifest.

## Implemented

- Added `pass1654-audit-pdf-shield-export-product` core.
- Added full `AuditReportExportPayload` builder.
- Added Lens PDF payload: cover badges, executive summary, sections, findings, appendix and forbidden claims.
- Added Shield Map payload: audit claim evidence graph, nodes, edges, confidence cap and verdict.
- Added public route `/security/audits/export/[id]`.
- Added `SecurityAuditExportPage` to preview the full export payload.
- Updated Audit Watch API to return `sampleExportPayload`, `exportPayload`, `lensPdfPayload` and `shieldMapPayload`.
- Updated report status page to link and preview full export.
- Updated Audit Watch landing page and console to expose full export links.
- Extended static route smoke with `/security/audits/export/sample`.

## Safety boundary

The export explicitly blocks Certified Safe / No Risk / Approved Investment language. It keeps exploit instructions out of public output, keeps high-risk detail behind responsible disclosure and preserves no-custody / no-seed / no-investment-advice copy.

## Still not claimed

This pass does not claim full build/typecheck/Playwright success inside the sandbox. Full Node 24 install and browser click proof still need to run outside the timeout-limited environment.
