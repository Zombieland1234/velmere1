# Velmère PASS602–606 — VLM Brain Evidence Topology Release

## Cel wydania

PASS602–606 przebudowuje VLM Brain z ciągle animowanego efektu WebGL w audytowalny interfejs dowodowy. Mózg pokazuje teraz jawny łańcuch `claim → agent → source → verdict`, ogranicza pewność przy konflikcie lub brakującym źródle, skaluje koszt renderowania do urządzenia i zachowuje pełną treść w fallbacku 2D.

## PASS602 — Neural evidence topology

- Każdy płat, agent, claim, źródło i werdykt ma stabilne ID.
- Krawędzie rozróżniają relacje `supports`, `routes`, `limits` i `conflicts`.
- Aktywna ścieżka pokazuje pełny lineage od wybranego pola do werdyktu.
- Topologia oddziela fakty, hipotezy, konflikty i brakujące źródła.
- Publiczny UI nie ujawnia prywatnych wag ani wewnętrznego scoringu.
- Etykiety topologii są dostępne w PL, DE i EN.

## PASS603 — Progressive lobe rendering

- Profil runtime uwzględnia viewport, liczbę rdzeni, pamięć urządzenia, coarse pointer i dostępność WebGL.
- Tryb `normal` renderuje do 10 węzłów, `constrained` do 7, a `critical` do 5.
- Po wyjściu poza viewport scena WebGL jest odmontowywana zamiast pozostawać aktywną w tle.
- Urządzenia bez WebGL lub w trybie krytycznym dostają fallback SVG 2D z tą samą treścią i aktywną ścieżką.
- `content-visibility`, containment i intrinsic size ograniczają koszt layoutu oraz paintu.

## PASS604 — Confidence propagation

- Pewność końcowa jest ograniczana przez najsłabszy stan źródłowy, a nie tylko przez średnią sygnałów.
- Twarde limity rozróżniają fakt, hipotezę, konflikt i missing source.
- UI pokazuje liczbę faktów, hipotez, konfliktów i braków źródeł.
- Każde ograniczenie zachowuje graf prowadzący do werdyktu.
- Granica pewności jest opisana językiem użytkownika zamiast diagnostyką operatora.

## PASS605 — Brain interaction contract

- Topologia działa jako semantyczny ARIA grid z roving focus.
- Arrow keys, Home, End, Enter, Space i Escape mają deterministyczne zachowanie.
- Modal ma focus trap, automatyczny fokus, powrót fokusu po zamknięciu i zamknięcie przez Escape.
- Touch targets mają minimum 44 px, a header respektuje safe-area telefonu.
- Scroll pozostaje wewnątrz audytu; tło nie przejmuje przypadkowych gestów.
- Układ kolumn zmienia się logicznie między mobile i desktopem.

## PASS606 — Evidence-driven neural motion

- Usunięta została nieskończona pętla renderująca dekoracyjny ruch mózgu.
- Animacja uruchamia się wyłącznie po pierwszym zestawie dowodów, zmianie fingerprintu danych lub zmianie aktywnego lineage.
- Każda animacja wykonuje dokładnie jedną iterację i przechodzi do stanu `settled`.
- `prefers-reduced-motion` zachowuje całą informację bez animacji.
- Publiczne etykiety FPS, drop-rate, replay mobile i techniczny HUD zostały usunięte.

## Zmienione powierzchnie

- `components/market-integrity/VlmNeuralAuditExperience.tsx`
- `app/globals.css`
- `lib/market-integrity/pass602-neural-evidence-topology.ts`
- `lib/market-integrity/pass603-progressive-lobe-rendering.ts`
- `lib/market-integrity/pass604-confidence-propagation.ts`
- `lib/market-integrity/pass605-brain-interaction-contract.ts`
- `lib/market-integrity/pass606-evidence-driven-neural-motion.ts`
- `scripts/verify-pass602-606-vlm-brain-topology-release.mjs`
- `tsconfig.pass606.json`
- `package.json`

## Walidacja

- PASS587–591: PASS
- PASS592–596: PASS
- PASS597–601: PASS
- PASS602–606: PASS
- PL / DE / EN: PASS
- Vercel preflight: PASS — 882 pliki
- Parser TypeScript: 879 plików TS/TSX, 0 błędów składni
- Strict TypeScript pięciu nowych modułów: PASS
- Testy runtime kontraktów PASS602–606: PASS
- Brak `node_modules`, `.next`, `.git`, cache i logów w paczce release

## Uczciwa granica walidacji

Pełny `next build` nie został zadeklarowany jako wykonany. Paczka nie zawiera `node_modules`, projekt wymaga Node.js 20.x, a środowisko robocze działało na Node.js 22.16.0. Target `typecheck:pass606` został dodany, lecz bez zainstalowanych typów React/Next/Three/Framer Motion zatrzymał się na brakujących zależnościach i wtórnych błędach JSX. Parser całego projektu oraz ścisły typecheck pięciu czystych modułów PASS602–606 przeszły poprawnie.
