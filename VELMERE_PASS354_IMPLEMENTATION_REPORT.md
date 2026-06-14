# PASS354 — Lux Market Proof Reader + Orbit SVG Scroll Router

## Zrobione
- Real Markets: dodany proof-reader strip dla kart: Najważniejsze / Nie udajemy / Większa pewność.
- Real Markets: poprawiony widoczny logo/glyph fallback dla stocków, ETF, commodities i giełd.
- Exchange Stability: usunięta publiczna powtarzalność "stability wyżej..." z kart; zostało jako jedna zasada/kompatybilność.
- Second Source: dodany prosty ludzki opis czym jest ten blok i czego brakuje przed pewnością.
- Orbit 360 drawer: scroll router obsługuje targety SVG/path/text przez `Element.closest`, resetuje scroll i focusuje frame po otwarciu.

## Testy
- verify:pass354-lux-market-orbit-scroll-router ✅
- verify:pass353-market-compass-orbit-router ✅
- verify:pass352-shield-grade-reader-orbit-contract ✅
- verify:pass351-clean-reader-orbit-scroll-router ✅
- verify:pass350-shield-reader-orbit-scroll-engine ✅
- verify:pass349-clean-reader-orbit-scrollframe ✅
- verify:pass348-real-market-pro-orbit-native ✅
- verify:pass347-real-market-reader-orbit-v5 ✅
- verify:pass346-real-market-cards-orbit-scroll ✅
- check:i18n ✅
- typecheck ❌ brak zależności/typów w paczce eksportowej (`next`, `react`, `lucide-react`, `@types/node`, `tailwindcss`, `zustand`, itd.)
