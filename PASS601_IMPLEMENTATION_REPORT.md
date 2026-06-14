# Velmère PASS597–601 — Shield Map Replay & Runtime Release

## Zakres wydania

PASS597–601 wzmacnia Shield Map jako rzeczywisty interfejs dowodowy, a nie dekoracyjną mapę. Pakiet obejmuje bezpieczny replay wielu snapshotów, ograniczenie kosztu renderowania, izolację aktywnej ścieżki dowodowej, pełną nawigację klawiaturą i ruch uruchamiany wyłącznie przez prawdziwą zmianę danych.

## PASS597 — Multi-snapshot evidence replay

- Replay obsługuje do sześciu ostatnich zweryfikowanych stanów tej samej tożsamości instrumentu.
- Snapshoty innego symbolu nie są mieszane z aktywną osią czasu i trafiają do jawnego stanu `identity_rejected`.
- Każda klatka pokazuje zmianę ryzyka, nowe i rozwiązane blokery, zmianę źródła oraz zmianę poziomu pewności.
- Historia jest normalizowana przed użyciem: błędne timestampy i rekordy bez tożsamości są odrzucane, risk jest ograniczany do 0–100, a duplikaty blokerów usuwane.
- Do 12 bezpiecznych rekordów jest przechowywanych w `sessionStorage`; brak dostępu do storage nie blokuje replayu w pamięci.
- Brakująca historia nie jest interpolowana ani dopowiadana.

## PASS598 — Visible-node virtualization

- Orbit 360 używa `IntersectionObserver`, aby odmontować węzły poza obszarem roboczym.
- Budżet renderowania zależy od widoczności, liczby rdzeni, pamięci urządzenia, szerokości viewportu i coarse pointer.
- Tryb normalny renderuje pełne 10 węzłów, constrained maksymalnie 7, critical maksymalnie 5, a offscreen 0.
- Backdrop filter i cięższe warstwy są wyłączane przy ograniczonej mocy urządzenia.
- `content-visibility`, `contain` i `contain-intrinsic-size` ograniczają koszt layoutu i paintu.

## PASS599 — Evidence-path isolation

- Aktywna warstwa izoluje cały przechodni łańcuch zależności i zależnych elementów, nie tylko pierwszy poziom.
- Konflikty są wykrywane dwukierunkowo.
- Źródła są agregowane z całej widocznej ścieżki.
- Niepowiązane węzły pozostają przygaszone, a aktywne zależności, konflikty i limit pewności są widoczne w atlasie oraz drawerze.
- Publiczny interfejs pokazuje źródła i granice pewności, ale nie ujawnia prywatnych wag scoringu.

## PASS600 — Spatial keyboard navigation

- Atlas działa jako semantyczny ARIA grid z prawidłowymi `row`, `gridcell`, `aria-rowindex`, `aria-colindex`, `aria-rowcount` i `aria-colcount`.
- Roving tabindex utrzymuje tylko jeden element w kolejności Tab.
- Arrow keys, Home, End, Enter, Space i Escape mają deterministyczne zachowanie.
- Liczba kolumn semantycznych jest synchronizowana z mobilnym lub desktopowym układem.
- Drawer ma focus trap, automatyczny fokus na pierwszej kontrolce i powrót fokusu do ostatniego węzła po zamknięciu.

## PASS601 — Evidence-only motion

- Wszystkie dekoracyjne nieskończone animacje Orbit 360 są wyłączone.
- Ruch pojawia się tylko podczas prawdziwego probe źródła lub po zmianie fingerprintu dowodowego.
- Każda animacja wykonuje dokładnie jedną iterację.
- `prefers-reduced-motion` wyłącza ruch bez utraty informacji.
- Drawer nie przechwytuje kliknięć ani scrolla strony podczas animacji wejścia; blokada scrolla uruchamia się dopiero po osiągnięciu stanu interaktywnego.

## Zmienione powierzchnie

- `components/market-integrity/ShieldMapClient.tsx`
- `app/globals.css`
- pięć nowych kontraktów PASS597–601
- nowy verifier i target TypeScript
- build chain projektu

## Walidacja

- PASS573–579: PASS
- PASS580–586: PASS
- PASS587–591: PASS
- PASS592–596: PASS
- PASS597–601: PASS
- PL / DE / EN: PASS
- Vercel preflight: PASS — 877 plików
- Parser TypeScript: 884 pliki TS/TSX, 0 błędów składni
- Strict TypeScript pięciu nowych modułów: PASS
- Testy runtime nowych kontraktów: PASS

## Uczciwa granica walidacji

Pełny `next build` nie został zadeklarowany jako wykonany. Paczka nie zawiera `node_modules`, sandbox działa na Node.js 22.16.0, a projekt ma kontrakt Node.js 20.x. Target komponentu `tsconfig.pass601.json` jest gotowy do uruchomienia po `npm ci` w środowisku Node 20; w obecnym sandboxie zatrzymał się na braku typów React/Next i zależności, a nie na błędzie parsera nowych plików.
