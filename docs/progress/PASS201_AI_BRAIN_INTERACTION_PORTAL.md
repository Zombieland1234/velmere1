# PASS201 — AI Brain Interaction Portal / Keyboard + Pause-On-Read

## Co zmieniło się realnie

- Kafelek VLM Brain nie otwiera już panelu detalu jako zwykłego dziecka sceny Orbit. Detail panel jest renderowany przez `document.body`, więc nie powinien być ucięty przez modal tokena, overflow, grid ani warstwę Orbit 360.
- Popup ma solidne ciemne tło, premium scrollbar i bardzo wysoki layer nad mózgiem.
- Klik poza panelem zamyka popup; `Escape` zamyka detail bez restartowania całego modala.
- `ArrowRight` / `ArrowDown` przechodzi do kolejnego ujawnionego kafelka, `ArrowLeft` / `ArrowUp` do poprzedniego.
- Orbit 360 zwalnia i pauzuje auto-ruch, kiedy użytkownik czyta detail — mniej klatkowania i mniej chaosu przy analizie.
- Plus/minus zoom HUD został ukryty w user-facing UI, ale wheel zoom i guard-compatible klasy zostały zachowane.

## Progress delta PASS201

| ID | Obszar | Previous | Current | Change |
|---|---|---:|---:|---:|
| D07 | Tile detail popup | 91% | 94% | +3% |
| D10 | Performance governor | 92% | 93% | +1% |
| D19 | Brain interaction click coverage | 84% | 87% | +3% |
| D20 | Brain portal layering / scroll lock | 92% | 95% | +3% |
| D23 | Brain accessibility / keyboard flow | 44% | 51% | +7% |
| J04 | Scroll lock / z-index layers | 91% | 93% | +2% |
| J06 | Animation performance | 90% | 92% | +2% |

**Realny product delta:** +21% na obszarach ruszonych w tym passie.

## Nadal blockery

- Real-browser QA na Vercelu: pointer, touch, Escape, arrow navigation, scroll panelu detalu.
- FPS test Orbit 360 na słabszym sprzęcie.
- Live holder/orderbook/contract/OSINT adapters nadal nie są produkcyjnie spięte.
- WebGL/Three.js lane nadal jest przyszłą migracją, nie produkcyjnym rendererem.

<!-- PASS201 marker: tile detail body portal + keyboard navigation + pause-on-read. -->
