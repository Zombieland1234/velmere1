# VELMÈRE PASS813 — runtime truth hotfix

Ten pass odpowiada bezpośrednio na screeny i błędy runtime zgłoszone po PASS812.

## Naprawione

- Language selector nie polega już na portalu: ma małą tabelkę inline pod klikniętym przyciskiem globe, outside-click i Escape.
- Connect wallet nie wyskakuje z lewego rogu: panel jest inline pod przyciskiem `Connect` w headerze.
- Cart drawer nie dziedziczy już globalnego `top/left` dla bocznych drawerów: bottom preset dostaje własne `data-velmere-motion-preset="bottom"` i CSS bottom/right sheet.
- `DrawerRoot` dostał jawny atrybut motion preset, żeby globalne reguły nie nadpisywały koszyka i bottom sheetów.
- Warstwy overlay podniesione nad header: listbox/dropdown/drawer/modal mają wyższy, jawny porządek.
- Lens/Shield/Shield Map search focus ma zostać zaokrąglony, bez kwadratowego złotego highlightu inputa.
- Shield tabela używa szerszego `luxury-section-wide`, chart column zostaje w tabeli, a table-layout jest wymuszony na pełnej szerokości.
- VLM Brain / orbit dostał wymuszone spokojne, ciągłe obroty 64–92 s, bez jednorazowego szybkiego obrotu.
- Naprawiony statyczny błąd w `VelmereIntelligenceSearchClient.tsx` po zdublowanym obiekcie kroku 02.

## Sprawdzone lokalnie

- `node scripts/verify-pass813-runtime-truth.mjs` — PASS 13/13.
- `node scripts/check-i18n.mjs` — PASS dla PL/EN/DE.
- scan `@google/genai` w app/components/lib/package — brak.

## Nadal do potwierdzenia u użytkownika / na Vercel

- realny `next build` na Node 24.16/npm 11.16;
- kliknięcia w Chrome: language / connect / cart / wallet more;
- Playwright E2E;
- Real Markets modal pełne 1:1 z Shield;
- pełny redesign Shield Map jako osobnego evidence graph, a nie kopii danych z Shield/PDF.

## Produktowa decyzja do następnych passów

Shield Map nie ma dublować Shield ani PDF. Jej rola ma być inna: pokazać drogę powstania oceny:
Źródła → Fakty → Sygnały → Konflikty → Braki → Confidence → Wniosek VLM.

To oznacza, że kolejne passy powinny usuwać z Shield Map terminalowe/raportowe duplikaty i zostawić graf dowodów + prawy drawer + mobile list.
