# Velmère — progres PASS627–631

| PASS | Obszar | Delta wdrożeniowa | Stan |
|---|---|---:|---|
| PASS627 | Motion token constitution: desktop/mobile/reduced, stagger i GPU budget | +15 | DONE |
| PASS628 | Skończona drabina overlay oraz usunięcie aktywnych ekstremalnych z-indexów | +16 | DONE |
| PASS629 | Referencyjny scroll ownership, wheel/touch boundary i restore pozycji | +19 | DONE |
| PASS630 | Stabilna geometria skeletonów i route/modal perceived performance shell | +14 | DONE |
| PASS631 | Focus trap/return/Escape, reduced motion, contrast, forced colors i 44 px | +17 | DONE |
| **Razem** | Premium Interaction Constitution Release | **+81** | **RELEASED** |

## Łączny ostatni odcinek

| Pakiet | Delta |
|---|---:|
| PASS602–606 | +58 |
| PASS607–611 | +63 |
| PASS612–616 | +69 |
| PASS617–621 | +74 |
| PASS622–626 | +82 |
| PASS627–631 | +81 |
| **Łącznie PASS602–631** | **+427** |

## Najważniejsze blockery usunięte

- każda powierzchnia nie ma już osobnego czasu i easing,
- mobile nie wykonuje kosztownego ruchu desktopowego,
- modale i listboxy nie walczą wartościami `2147483647`,
- nested overlay nie zdejmuje blokady scrolla przed zamknięciem ostatniej warstwy,
- gest na granicy modala nie przesuwa tła,
- globalne `touch-action: none` nie blokuje wewnętrznego scrolla telefonu,
- route i dynamiczny modal nie zapadają geometrii podczas ładowania,
- menu, drawer i VLM modal mają focus contain, Escape i focus return,
- source states oraz focus zachowują czytelność także w forced-colors.
