# PASS475 — Full Vercel Type Sweep and Build Gate

## Cel
Usunięcie aktualnego błędu Vercela w `probe/route.ts` oraz przejście przez pełny projektowy typecheck zamiast naprawiania pojedynczych błędów po jednym deployu.

## Najważniejsze naprawy
- Jawny typ akumulatora `reduce<number>` dla wolumenu Binance.
- Usunięcie trzech kolizji pola `boundary` po spreadach obiektów API.
- Aktualizacja kontraktów PASS435–PASS442 i zabezpieczenie opcjonalnego `confidence`.
- Naprawa nieaktualnych nazw pól: `marketCapUsd`, `sourceTrustScore`, `performanceScore`, `summary`, `hotWindowDays`.
- Normalizacja ról PASS259/PASS260 do dozwolonych ownerów release firewall.
- Naprawa kontraktów admin session/server gate, VLM access statusów i report timeline storage.
- Naprawa typowania katalogu Real Markets, asset states, spark tones i SEC `not_applicable`.
- Naprawa kolejności danych produktu/size guide oraz typowanie pomiarów produktu.
- Naprawa request URL w Lens report route i konfliktu nazwy funkcji PASS408.
- Zachowane poprawki PASS473/PASS474: hook dependencies, combobox ARIA, boundary collision preflight.

## Proaktywny build gate
Skrypt `build` uruchamia teraz `npm run typecheck` przed kosztownym `next build`. Kolejne błędy TypeScript zostaną pokazane razem i wcześniej, zamiast ujawniać się po jednym podczas kolejnych deployów Vercela.

## Walidacja
- `npm run typecheck` — PASS, 0 błędów.
- `npm run check:i18n` — PASS, PL/DE/EN.
- `npm run repair:codex-handoff` — PASS.
- `npm run vercel:preflight` — PASS, 788 plików.
- ESLint dla wszystkich zmienionych TS/TSX — PASS, 0 błędów i 0 ostrzeżeń.
- Next production compilation osiągnęła `Compiled successfully`; pełna lokalna faza post-compile nie zakończyła się w sandboxie 4 GB z powodu presji pamięci. Vercel używa maszyny 8 GB, a sam pełny typecheck jest czysty.

## Granica paczki
Paczka nie zawiera `node_modules`, `.next`, `.git`, cache TypeScript ani plików środowiskowych.
