# Velmère — progres PASS612–616

| PASS | Obszar | Delta wdrożeniowa | Stan |
|---|---|---:|---|
| PASS612 | Jeden kontrakt live/partial/stale/fallback/offline | +14 | DONE |
| PASS613 | VisualViewport, safe-area, focus i single-scroll modal | +13 | DONE |
| PASS614 | Source-bound crosshair i chart evidence rail | +14 | DONE |
| PASS615 | Unikalne tier fields 10/14/20 i pamięć wyboru | +15 | DONE |
| PASS616 | Mobile 320–430, landscape, keyboard, zoom 200% | +13 | DONE |
| **Razem** | Shield Terminal Source & Mobile Release | **+69** | **RELEASED** |

## Łączny ostatni odcinek

| Pakiet | Delta |
|---|---:|
| PASS602–606 | +58 |
| PASS607–611 | +63 |
| PASS612–616 | +69 |
| **Łącznie PASS602–616** | **+190** |

## Regresje zabezpieczone

- Route/request timestamp nie może udawać timestampu providera.
- Fallback chart nie może otrzymać publicznej etykiety `live`.
- Opcjonalny brak OSINT nie zeruje bazowej analizy rynku, ale pozostaje widoczną luką.
- Header strony nie przykrywa modala po otwarciu klawiatury lub zoomie.
- Tło strony nie przejmuje scrolla, gdy dialog jest aktywny.
- X pozostaje osiągalny i focus wraca do elementu otwierającego.
- Basic/Pro/Advanced nie powtarzają tej samej liczby pól.
- Crosshair ceny nie odrywa danych od źródła i timestampu.
- Układ zachowuje 44 px targety, safe-area i reduced-motion.
