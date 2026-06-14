# VELMERE UI/UX AUDIT — PASS754

Data: 2026-06-10

| Obszar | Wynik |
|---|---:|
| Trasy stron | 58 |
| Trasy API | 100 |
| Pliki TS/TSX | 939 |
| Pliki z createPortal | 10 |
| Pliki z dialogami | 19 |
| Surowe klasy z-index | 80 |
| Globalne listenery wheel | 2 |

## Krytyczne przyczyny

- niespójne portale i lokalne stacking contexts;
- backdrop i panel oddzielone wcześniej tylko jednym poziomem;
- Square oznaczał nieruchomy shell jako scroll region zamiast przewijanych kolumn;
- wallet miał osobny Escape bez wspólnego focus trapu;
- wykres nie deklarował jawnej własności wheel;
- wiele historycznych override’ów CSS.

## Naprawy

- wspólne `ModalRoot` i `DrawerRoot` pod `document.body`;
- osobne warstwy backdrop/surface;
- focus trap, Escape, restore focus, scroll lock i render fallback;
- migracja Square post/composer;
- jawne regiony scrolla Square i Cart;
- focus boundary dla wallet;
- lokalny wheel owner dla wykresów;
- skończona drabina warstw 0–100.

## Pozostałe ryzyka

- historyczny wheel router w `TokenRiskModal`;
- lokalne portale Lens/PDF i części analitycznych popupów;
- pełne E2E wymaga stabilnego uruchomienia przeglądarki;
- screenshot QA nie jest deklarowane bez rzeczywistego renderu.
