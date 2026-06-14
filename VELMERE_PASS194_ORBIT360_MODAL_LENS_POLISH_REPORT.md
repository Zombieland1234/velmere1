# Velmère PASS194 — Orbit 360 Modal Cleanup + Chart Drag Fix + Lens Button Removal

## Scope
This pass targets the exact browser QA issues from the screenshots and voice note:
- reverse token chart drag direction,
- make mode description a single centered popup,
- hide Source Spine / muted second description under mode popup,
- make VLM Orbit 360 the only visible brain mode for Basic/Pro/Advanced for now,
- force VLM brain overlay to near-full viewport and keep core centered,
- move Back to chart control to the top-right,
- improve Advanced Orbit card readability,
- make selected tile detail a centered popup above everything,
- remove Lens card action buttons and make Lens a clean search/description surface,
- improve token suggestion logo fallback by passing id/name to TokenAvatar.

## Boundary
Evidence Board code is retained but hidden from the UI for now. The PDF-ready Lens route is retained, but visible card buttons are removed until the real PDF generator is built.
