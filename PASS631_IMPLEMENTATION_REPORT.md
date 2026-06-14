# PASS627–631 — Premium Interaction Constitution Release

## Cel

Ujednolicić ruch, warstwy, scroll, stan ładowania i dostępność całej platformy Velmère. Browser, Shield, Shield Map, VLM Brain, Real Markets, portfel i menu nie mogą posiadać osobnych, sprzecznych zasad animacji ani wygrywać nakładania przez przypadkowe `z-index`.

## PASS627 — motion token constitution

Dodano `lib/ui/pass627-motion-constitution.ts` oraz `useVelmereMotionProfile`:

- jeden kontrakt `duration / easing / spring / distance / stagger`,
- osobne budżety dla desktopu, małego viewportu i coarse pointer,
- reduced motion usuwa drogę przestrzenną i czas animacji bez wyłączania funkcji,
- dekoracyjne pętle są wyłączane na touch i przy reduced motion,
- stagger jest ograniczony, dzięki czemu duża liczba elementów nie wydłuża wejścia ekranu,
- `lib/motion.ts` zachowuje kompatybilność ze starszymi komponentami.

Kontrakt został użyty w przejściach stron, menu, panelach bocznych, VLM mode switch i overlayu zmiany poziomu.

## PASS628 — overlay i z-index constitution

Dodano skończoną drabinę warstw:

- content 0,
- raised 10,
- sticky 20,
- header 30,
- listbox 40,
- floating action 50,
- drawer 60/61,
- modal 70/71,
- nested modal 80/81,
- toast 90,
- skip link 100.

Usunięto aktywne wartości typu `99999` i `2147483647` z powierzchni produktu. Search/listbox pozostaje pod modalem, nested dialog nad bazowym modalem, a skip link ma najwyższą, ale nadal skończoną warstwę.

Znormalizowano m.in.:

- Navbar,
- Wallet Connect,
- Lens/Browser,
- Shield i TokenRiskModal,
- VLM mode switch,
- VLM access panel,
- LuxuryActionModal,
- SideActionPanel.

## PASS629 — scroll ownership constitution

`useModalScrollLock` został przebudowany na wspólny, referencyjnie liczony system właściciela strony:

- pierwszy aktywny portal zapisuje pozycję i blokuje dokument,
- kolejne nested modale zwiększają licznik, ale nie nadpisują snapshotu,
- zamknięcie warstwy podrzędnej nie przywraca strony za wcześnie,
- po zamknięciu ostatniej warstwy wraca dokładna pozycja X/Y,
- wheel i touch mogą być konsumowane wyłącznie przez `[data-modal-scroll-region="true"]`,
- na górnej/dolnej granicy regionu gest nie przecieka do tła,
- `scrollbar-gutter` ogranicza skok szerokości,
- nie stosujemy globalnego `touch-action: none`, które blokowałoby pan wewnątrz modala na telefonie.

## PASS630 — perceived-performance shell

Dodano `StableSkeleton` oraz czysty kontrakt geometrii:

- skeleton deklaruje finalną minimalną wysokość,
- duża różnica skeleton → content jest oznaczana jako `review`,
- stan pending/partial ma `aria-busy`,
- route loading zachowuje wysokość głównego modułu,
- dynamiczny loader TokenRiskModal zachowuje 560 px zamiast zapadać się do małego spinnera,
- shimmer wykonuje tylko dwie iteracje, a przy reduced motion jest wyłączony,
- `contain` i `content-visibility` izolują koszt placeholdera.

## PASS631 — reduced motion, focus i contrast sweep

Dodano wspólny `useDialogFocusBoundary`:

- fokus trafia do dialogu po otwarciu,
- Tab i Shift+Tab pozostają wewnątrz aktywnego dialogu,
- Escape zamyka warstwę,
- po zamknięciu fokus wraca do kontrolki otwierającej.

Hook został podpięty do menu, paneli bocznych i modala VLM. Menu otrzymało własny ref oraz `tabIndex=-1`, więc działa również wtedy, gdy wewnątrz chwilowo brak aktywnej kontrolki.

Dodatkowo:

- globalny `:focus-visible` jest jednoznaczny na ciemnym tle,
- disabled controls zachowują rozpoznawalny stan,
- source states live/review/blocked mają testowany kontrast,
- forced-colors otrzymuje systemowy outline i border,
- touch targets są bramkowane od 44 px,
- mobile/coarse pointer zatrzymuje ciągłe dekoracyjne animacje GPU.

## Integracja publicznych powierzchni

Najważniejsze komponenty używają teraz wspólnych zasad zamiast lokalnych wyjątków:

- Browser/PDF modal,
- Shield chart modal,
- Shield Map drawers i detail portals,
- VLM Brain i mode transitions,
- Real Markets modal,
- Navbar i menu mobile,
- Wallet Connect,
- globalne loading states.

Publiczny UI nie pokazuje FPS, drop-rate ani technicznego HUD-u. Zmiana dotyczy mechaniki interakcji i płynności, nie dodaje operatorowej diagnostyki do produktu.

## Regresje zabezpieczone

- mobile motion jest krótszy od desktopowego,
- reduced motion nie zachowuje dystansu, duration ani dekoracyjnego loopa,
- maksymalna aktywna warstwa jest skończona i nie przekracza 100 w konstytucji,
- listbox nie przebija modala,
- nested modal pozostaje nad bazowym dialogiem,
- scroll w środku regionu działa, a na granicy nie przecieka,
- nested overlay nie przywraca strony przedwcześnie,
- skeleton o tej samej geometrii ma niski layout-shift risk,
- focus trap, focus return, Escape, kontrast i target 44 px są wymagane,
- globalne `touch-action: none` nie może wrócić do blokady modala,
- aktywny kod nie zawiera z-index większego niż 500.

## Walidacja

- PASS592–596: PASS
- PASS597–601: PASS
- PASS602–606: PASS
- PASS607–611: PASS
- PASS612–616: PASS
- PASS617–621: PASS
- PASS622–626: PASS
- PASS627–631: PASS
- strict TypeScript pięciu nowych kontraktów: PASS
- i18n PL/DE/EN: PASS
- Vercel preflight: PASS — 910 plików
- parser TS/TSX: PASS — 917 plików, 0 błędów składni
- CSS structural parser: PASS — 1 plik, 0 błędów
- aktywne z-index > 500: 0

Pełnego `next build`, pełnego semantycznego typechecku i ESLint nie deklarujemy. Release nie zawiera `node_modules`; `next lint` zakończył się `next: not found`, a pełny `tsc --noEmit` nie może rozwiązać React/Next/Zustand/Node/Playwright bez zależności. Produkcyjny gate należy wykonać po `npm ci` w Node.js 20.x.
