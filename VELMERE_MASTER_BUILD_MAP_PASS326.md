# Velmère Master Build Map — PASS326

PASS326 kontynuuje public cleanup i UX repair po PASS314–PASS325.

## Dotknięte ID
- E07 PDF-ready report preview: A4 in-page preview zamiast popupu.
- M06 Report download route: realny `application/pdf` endpoint bez zewnętrznych zależności.
- D01 VLM Orbit 360 shell: full-screen overlay dla Basic/Pro/Advanced.
- D07 Tile detail popup: prawy drawer z animacją i natywnym scrollowaniem.
- D20 Brain portal layering / scroll lock: usunięto wheel hijack z detail drawer.
- C02 Shield search dropdown: sugestie przypięte do input, bez fixed portal skaczącego na scrollu.
- I07 Lookbook: kolekcja kierowana w lookbook, nie launch-control wall.
- F01/F02 Security: publiczny opis krótki, pełne blokery przeniesione do handoff promptu.
- J03/J04 Responsive/scroll/z-index: A4 sheet, mobile bottom sheet, dropdown containment.

## Zasada
Publiczny UI ma być showroomem. Operatorowy system ma zostać w kodzie, guardach, adminie, mapie i dokumentach handoff.

<!-- PASS326 marker: A4 PDF browser, fullscreen Orbit 360, right-edge native-scroll drawer, anchored dropdown, lookbook collection. -->
