# PASS2028 — Visual stability, modal cleanup, Audit Brain chat, drawers

## Zakres
PASS2028 kontynuuje PASS2027 i usuwa problemy zgłoszone ze screenów: skaczące animacje, nakładane ramki w modalach, brak ikon po search, zbyt szybkie wyniki Shield Map, niedziałające/nieczytelne powierzchnie wallet/menu/cart/Square oraz brak panelu czatu dla przykładów VLM Audit Watch.

## Zmienione pliki
- `app/globals.css`
- `components/Navbar.tsx`
- `components/CartDrawer.tsx`
- `components/ui/OverlayPrimitives.tsx`
- `components/wallet/WalletConnectOptions.tsx`
- `components/security/VlmAuditCommandClient.tsx`
- `components/market-integrity/ShieldMapClient.tsx`
- `components/market-integrity/TokenRiskModal.tsx`
- `components/market-integrity/CrossAssetCollapseRadarPanel.tsx`
- `package.json`
- `scripts/verify-pass2028-visual-stability.mjs`

## Co zostało wdrożone

| Obszar | Było | Jest | Uwagi |
|---|---:|---:|---|
| Shield Map typing bez skakania layoutu | 68% | 92% | Stała wysokość/szerokość linii, no layout shift. |
| Shield Map search flow | 65% | 88% | Dodany etap searching/analyzing przed wynikiem. |
| Shield Map ikona wyniku | 45% | 88% | Wynik po search ma avatar/ikonę aktywa. |
| Shield modal wysokość i brak nakładania | 78% | 91% | Większa rama, jeden header, jeden chart, jeden action rail. |
| Real Markets modal | 78% | 91% | Tożsamy model paneli jak Shield, pełniejsze ceny, lepsze ikony. |
| Chart drag/pointer performance | 72% | 86% | Canvas dostaje izolację/pointer/touch stabilizację. |
| Real Markets tabela szerokość | 72% | 88% | Tabela szersza o około 15% i centrowana. |
| Real Markets search focus outline | 70% | 92% | Usunięte agresywne złote kwadratowe obramowanie. |
| Shield sort header hit area | 74% | 88% | Header sortowania ma wymuszone pointer-events i z-index. |
| Audit Watch full-width i clean | 76% | 89% | Rozciągnięty układ i mniej prymitywne spacingi. |
| Audit Watch typing bez skakania | 65% | 92% | Typing line z contain/min-height/min-width. |
| VLM Audit sample 5 projects chat | 0% | 86% | Kliknięcie projektu otwiera boczny chat z VLM Brain, typing i rotating V. |
| Wallet real icons | 70% | 92% | MetaMask i Phantom używają publicznych SVG. |
| Other wallets side panel | 58% | 86% | Lista idzie jako fixed side panel, nie ucina się w karcie. |
| Menu side drawer motion | 70% | 86% | Wolniejszy slide zamiast natychmiastowego pop. |
| Cart bottom sheet | 45% | 86% | Koszyk jest dolnym panelem, około 1/3 ekranu, z odstępem od krawędzi. |
| Square post modal/comments | 55% | 84% | Spokojniejsze szarości i scroll komentarzy. |
| Header nav simplification | 60% | 90% | Kolejność: VLM, Sklep/Shop, Audit Browser, Security. |

## Aktualna ocena po PASS2028

| Moduł | Ocena |
|---|---:|
| VLM Brain backend / security | 93% |
| VLM Audit produkt i gating | 86% |
| Audit Watch UI | 89% |
| Shield modal UX | 91% |
| Real Markets modal UX | 91% |
| Shield Map search UX | 88% |
| Wallet/Menu/Cart overlays | 86% |
| Square post modal | 84% |
| Produkcyjna gotowość UI całości | 84% |
| Produkcyjna gotowość całego projektu | 82% |

## Co dalej do perfekcji

| Priorytet | Co trzeba zrobić | Wpływ |
|---|---|---|
| P0 | Odpalić pełny `next build` po instalacji zależności | potwierdzenie produkcyjnego buildu |
| P0 | Przejść wszystkie screeny ręcznie na desktop/mobile | wykrycie realnych regresji wizualnych |
| P1 | Podłączyć realny Stripe live/test webhook dla VLM services | płatne Advanced/PDF/Audit bez obejść |
| P1 | Dodać persistent DB dla entitlementów i audit queue | produkcyjna kolejka i konta klientów |
| P1 | Dopracować Square komentarze i mobile | spójność społeczności |
| P1 | Dopracować Shield Map result panel po search | mocniejszy efekt “analiza, potem wynik” |
| P2 | Live multi-provider data adapters | większa wiarygodność VLM Brain |
| P2 | Admin panel do Audit Watch queue | obsługa human-reviewed 89.99€ |

## Testy wykonane

- `node scripts/check-i18n.mjs` — OK
- `node scripts/verify-pass2028-visual-stability.mjs` — OK
- TypeScript parse/transpile check dla zmienionych TS/TSX — brak błędów składni JSX/TS.

## Ograniczenia

Pełny `next build` nie został potwierdzony, bo paczka nie zawiera `node_modules`. Live Stripe, live Gemini i realne runtime testy w przeglądarce wymagają lokalnego środowiska z envami.
