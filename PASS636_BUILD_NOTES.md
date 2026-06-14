# PASS636 — build notes

## Potwierdzone

- runtime środowiska: Node.js `v22.16.0`
- wymaganie projektu: Node.js `20.x`
- TypeScript CLI: `5.8.3`
- PASS592–636 gates: PASS
- strict TypeScript PASS632–636 pure contracts: PASS
- zintegrowany runtime `buildLensReport` + redaction gate: PASS
- PL / DE / EN i18n: PASS
- Vercel preflight: PASS — 915 plików
- parser TS/TSX: 922 pliki, 0 błędów składni
- CSS structural parser: 1 plik, 0 błędów
- redaction leak regression: PASS
- fixed-window / Retry-After / cooldown regression: PASS
- provider failure drill matrix: PASS — 7/7 scenariuszy

## Niepotwierdzone

- pełny `next build`
- pełny semantyczny `tsc --noEmit`
- `next lint`

## Dokładny powód

Paczka release celowo nie zawiera `node_modules`.

- `npm run lint` → exit 127, `sh: 1: next: not found`
- `npm run typecheck` → exit 2; brak zainstalowanych modułów i typów React, Next, Zustand, Node, Tailwind i Playwright oraz istniejące wcześniej miejsca wymagające pełnego semantic sweepu

Nie oznaczamy tego jako powodzenia ani jako błąd składni PASS632–636. Pełny release proof jest osobnym pakietem PASS637–641 i wymaga czystej instalacji w deklarowanym Node.js 20.x.

## Zalecana walidacja lokalna

```bash
nvm use 20
npm ci
npm run verify:pass632-636-security-runtime-release
npm run typecheck
npm run lint
npm run build
```

## Konfiguracja produkcyjna

Wartości w `.env.example` są serwerowe. Nie należy prefiksować ich `NEXT_PUBLIC_`.

```bash
VELMERE_RATE_LIMIT_DISABLED=0
VELMERE_AUDIT_APPEND_DISABLED=0
VELMERE_AUDIT_UPSTASH_KEY=velmere:audit:events
VELMERE_SECURITY_EVENT_UPSTASH_KEY=velmere:security:events
```

W środowisku bez Upstash system przechodzi w jawny, ograniczony tryb pamięciowy/degraded i nie może przedstawiać wyniku jako pełnego live proof.
