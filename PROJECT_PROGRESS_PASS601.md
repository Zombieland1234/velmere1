# Velmère — progres PASS597–601

| PASS | Obszar | Delta wdrożeniowa | Stan |
|---|---|---:|---|
| PASS597 | Multi-snapshot replay, identity guard, session continuity | +12 | DONE |
| PASS598 | Visible-node virtualization, GPU pressure budgets | +11 | DONE |
| PASS599 | Transitive evidence path, conflicts, source isolation | +13 | DONE |
| PASS600 | ARIA grid, roving focus, spatial keyboard, focus trap | +10 | DONE |
| PASS601 | Evidence-only motion, reduced motion, delayed scroll lock | +11 | DONE |
| **Razem** | Shield Map replay/runtime release | **+57** | **RELEASED** |

## Regresje zabezpieczone

- Replay nie miesza różnych instrumentów.
- Brak historii nie jest sztucznie uzupełniany.
- Orbit poza viewportem nie utrzymuje kosztownego drzewa animacji.
- Mobile i urządzenia słabsze dostają mniejszy budżet węzłów.
- Tab, strzałki i Escape nie gubią fokusu.
- Drawer nie kradnie scrolla podczas wejścia.
- Ruch nie działa bez realnego probe lub zmiany dowodowej.
