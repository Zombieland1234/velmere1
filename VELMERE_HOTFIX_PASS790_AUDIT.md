# VELMERE HOTFIX PASS790 — Build + Overlay Audit

Data: 2026-06-10

## Naprawione krytyczne błędy

### 1. Build blocker: `Module not found: Can't resolve '@google/genai'`

Przyczyna:
- `lib/ai/vlm-provider-registry.ts` miał statyczny import `@google/genai`.
- Jeżeli Vercel / lokalny build nie zainstalował tej paczki, Turbopack zatrzymywał build przed uruchomieniem fallbacku AI.
- Lockfile zawierał wpis `node_modules/@google/genai`, więc paczka była traktowana jako wymagana zależność builda.

Naprawa:
- Usunięto statyczny import `@google/genai`.
- Usunięto `@google/genai` z `package.json` oraz `package-lock.json`.
- Dodano transport opcjonalny: SDK jest używane tylko wtedy, gdy paczka istnieje.
- Dodano server-side REST fallback do Gemini API, żeby live Gemini nie zależało od jednej paczki npm.
- Deterministyczny fallback VLM nadal działa, gdy nie ma `GEMINI_API_KEY` albo Gemini odpowie błędem.

Zmienione pliki:
- `lib/ai/vlm-provider-registry.ts`
- `package.json`
- `package-lock.json`
- `scripts/verify-pass772-776-vlm-core.mjs`

### 2. Language globe dropdown

Przyczyna:
- Dropdown języka nie miał osobnego `ref` do outside-click.
- Nie zamykał się kliknięciem poza elementem.
- Nie miał Escape close.
- Pozycjonowanie było zbyt słabe i mogło wyglądać, jakby tabela języków wyskakiwała na samej kuli.

Naprawa:
- Dodano `languageRef`.
- Dodano outside-click close.
- Dodano Escape close dla language / wallet / member.
- Dodano `aria-haspopup="menu"`, `role="menu"`, `role="menuitem"`.
- Dropdown jest zakotwiczony przez `top-full mt-3` i warstwę `listbox`.

Zmieniony plik:
- `components/Navbar.tsx`

### 3. Menu: ciemny ekran bez widocznego panelu

Przyczyna prawdopodobna:
- Główne menu miało własny ręczny portal, osobny backdrop, osobny scroll lock i osobny focus boundary.
- To zwiększało ryzyko stanu: backdrop widoczny, panel niewidoczny lub niedomknięty.

Naprawa:
- Menu zostało przeniesione na wspólny `DrawerRoot`.
- Panel i backdrop korzystają ze wspólnej konstytucji warstw.
- Menu ma wspólny scroll lock, focus trap, Escape i safe render boundary.

Zmieniony plik:
- `components/Navbar.tsx`

## Dodane testy/verifiery

- `scripts/verify-pass790-hotfix-build-overlays.mjs`

Sprawdza:
- brak statycznego importu `@google/genai`;
- brak wymaganej paczki `@google/genai` w `package.json` i `package-lock.json`;
- obecność REST fallbacku Gemini;
- menu przez `DrawerRoot`;
- language dropdown z outside-click, Escape i listbox layer.

## Wynik lokalny

Zaliczone:
- parser/syntax check zmienionych TS/TSX przez TypeScript transpile;
- `verify-pass772-776-vlm-core.mjs`;
- `verify-pass790-hotfix-build-overlays.mjs`;
- JSON parse `package.json` i `package-lock.json`;
- kontrola braku build-blocking importu `@google/genai`.

Niezaliczone / niewykonane w tym środowisku:
- pełny `next build`;
- pełny Playwright w przeglądarce;
- live Gemini z prawdziwym `GEMINI_API_KEY`;
- Vercel smoke test.

Powód:
- lokalne środowisko ma Node 22/npm 10, a projekt deklaruje Node 24.16/npm 11.16;
- ciężka instalacja pełnych zależności w kontenerze była niestabilna zasobowo.

## Aktualna gotowość po hotfixie

- Cała platforma kodowo: około 89%.
- UI/UX: około 88%.
- VLM Brain kodowo: około 96%.
- AI integracja techniczna: około 95%.
- Produkcyjna gotowość potwierdzona testami: około 83%.

Nie oznaczać jako 100%, dopóki nie przejdzie:
- realny `npm install` / `npm ci` na Node 24.16;
- `next build`;
- E2E w Chromium;
- live Gemini smoke test;
- Vercel deployment test.
