# Velmère PASS641 — production source release

To archiwum zawiera pełne aktualne źródła projektu Velmère po poprawkach PASS637–641.

## Potwierdzone bramki

- Node.js 20.20.2
- npm ci: 907 paczek, exit 0
- ESLint: 0 błędów, 0 ostrzeżeń
- TypeScript semantic typecheck: 0 błędów
- PASS637–641 verifier: PASS
- Vercel preflight: PASS, 915 plików
- Next.js production compile: exit 0
- Next.js production generate: exit 0
- Produkcyjny smoke tras PL/DE/EN: PASS

## Ważna poprawka middleware

Redundantny absolutny self-rewrite next-intl został zamieniony na prawdziwe przejście `NextResponse.next()`. Zachowane są locale, cookies i hreflang, bez pętli proxy oraz pustych odpowiedzi 200.

## Instalacja

```bash
npm ci
npm run typecheck
npm run lint
npm run build
```

Projekt deklaruje Node.js 20.x.

## Celowo wykluczone z ZIP

- node_modules
- .next
- .git
- cache i logi procesów
- raporty testowe generowane lokalnie

Są to artefakty odtwarzalne i nie stanowią źródeł projektu.
