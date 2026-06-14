# PASS1414–1453 Runtime simplification and rectangular market modal repair

This pass responds to the live console/runtime feedback after PASS1413.

## Fixed runtime blockers

- Account menu duplicate `/en/account` identity is de-duped before rendering.
- Desktop, legal and drawer links use composite keys instead of fragile href-only keys.
- PDF choice modal keeps null-safe `pdfPreview?.report` guards while a depth is being selected.
- Dropdown surfaces are viewport-bounded so language/wallet/account panels cannot disappear off screen.
- Chart hover rendering is throttled with `requestAnimationFrame` to avoid lag from pointer-move spam.

## Simplified product direction

- Public Shield/Real Markets detail view stays a rectangular chart modal.
- Basic / Pro / Advanced are attached rectangular rail controls beside the chart.
- The old circular/bubble analysis overlay stays disabled in public runtime.
- Real Markets top strip no longer renders extra pill controls; it becomes one quiet explanatory line.
- Sort remains available only as inline table-header sorting, not as separate sort buttons.

## Still not claimed

Full 100% is still blocked until the project passes full install, typecheck, lint, build and browser screenshot QA in a non-timeout Node 24 environment.
