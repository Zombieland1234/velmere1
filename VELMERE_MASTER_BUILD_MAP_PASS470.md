# VELMÈRE MASTER BUILD MAP — PASS470

## A. Velmère Browser / Lens
- [x] Wynik pod wyszukiwarką z PASS467 utrzymany.
- [x] Runtime guard dla wyników bez pełnego payloadu.
- [x] Brak surowego `unknown` przy pustych źródłach — UI pokazuje `source_required`.
- [x] Historia PDF receiptów w podglądzie.
- [x] Keyboard-only QA dla najważniejszych kontrolek.

## B. PDF A4
- [x] PASS469 A4 overflow guard utrzymany.
- [x] Reader-safe marker dla podglądu.
- [x] Download receipt history widoczna bez ujawniania payloadu.
- [ ] Pełny screenshot comparison w Chromium — do PASS471.

## C. Basic / Pro / Advanced
- [x] Wybór poziomu pozostaje aktywny w flow generowania.
- [x] Keyboard activation Enter/Space dla depth buttons.
- [x] Receipt history zapisuje poziom PDF.

## D. Shield AI
- [x] PASS469 handoff boundary utrzymany.
- [x] Browser packet nadal jest kontekstem, nie werdyktem.
- [ ] Kolejny pass: pokazać receipt drawer również w Shield AI.

## E. Orbit 360
- [x] Handoff context z PASS468 utrzymany.
- [ ] Kolejny pass: visual focus/keyboard path do Orbit z Browsera.

## F. Real Markets
- [x] PASS466/467 catalog flow utrzymany.
- [ ] Kolejny pass: fuzz test niepełnych provider payloadów.

## G. Provider Truth / Consensus
- [x] PASS458–464 regresje przechodzą.
- [x] Nie dodano fake-live ani synthetic certainty.
- [ ] Kolejny pass: live/provider smoke w środowisku z DNS i sekretami.

## H. Accessibility
- [x] Combobox, PDF depth, download i close są objęte keyboard audit.
- [x] Escape close i modal trap marker.
- [ ] Kolejny pass: pełny keyboard-only Playwright.

## I. i18n
- [x] PL/DE/EN przechodzi `check:i18n`.
- [x] Dodane copy dla historii PDF i keyboard QA.

## J. Runtime Safety
- [x] Guardy na undefined/null w Browser result.
- [x] Native constructor collision scan.
- [x] Pełny syntax sweep 778 TS/TSX.

## K. Packaging
- [x] Pełny ZIP projektu bez `node_modules`, `.next`, `.git`.
- [x] SHA-256 i `unzip -t`.

## L. Known blockers
- Brak pełnego `next build` bez `node_modules`.
- Brak Chromium/Playwright w sandboxie.
- Live provider checks wymagają sekretów.

## M. PASS471 backlog
- Playwright Browser → PDF → keyboard-only → download → close.
- Receipt history drawer.
- Provider payload fuzzing Real Markets/Shield/Orbit.
- Screenshot comparison dla Basic/Pro/Advanced A4.
