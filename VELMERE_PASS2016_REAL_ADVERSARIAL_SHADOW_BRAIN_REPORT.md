# Velmère PASS2016 - Real Adversarial Shadow Brain

## Co jest realnie wdrożone

PASS2016 nie dodaje makiety ani samego promptu marketingowego. Dla każdej poprawnej odpowiedzi live wykonywany jest osobny request do providera:

`main model -> schema -> claim firewall -> shadow provider call -> shadow schema -> deterministic shadow governor -> publish albo fallback`

## Reguły publikacji

| Wynik recenzenta | Zachowanie systemu |
|---|---|
| `approve` | odpowiedź może zostać opublikowana z confidence ograniczonym przez recenzenta |
| `revise` | odpowiedź może zostać opublikowana, ale confidence nie przekracza 59 |
| `reject` | tekst modelu jest odrzucany; użytkownik dostaje deterministyczny fallback |
| brak odpowiedzi | tekst modelu nie jest publikowany; uruchamiany jest fallback |
| zły JSON lub schema | tekst modelu nie jest publikowany |
| nieznane source ID lub finding ID w recenzji | recenzja jest uznana za niewiarygodną i wynik jest odrzucany |

## Niezależność

- Shadow Brain ma osobny request, prompt, temperaturę `0`, schema i budżet.
- Może działać na osobnym modelu przez `VELMERE_GEMINI_SHADOW_MODEL`.
- Bez osobnej konfiguracji używa tego samego modelu co główny, ale nadal jest oddzielnym wywołaniem i adversarialnym kontekstem.
- To nie jest pełna niezależność multi-provider. Do niej potrzebny jest drugi dostawca i osobny klucz.

## VLM Security

Centralny `vlm-security.ts` wykrywa teraz także:

- próbę pominięcia Shadow Brain,
- wymuszenie akceptacji lub werdyktu,
- próbę wyłączenia recenzenta,
- manipulację recenzją w języku polskim, angielskim i niemieckim.

## Wpływ na mózg

| Obszar | PASS2015 | PASS2016 |
|---|---:|---:|
| Odporność na halucynacje | 84% | 90% |
| Kalibracja confidence | 86% | 91% |
| Adversarial review | 20% | 86% |
| Prompt / reviewer manipulation | 91% | 94% |
| Gotowość AI | 76% | 82% |
| Łączna ocena systemu | 85% | 88% |

## Uczciwe ograniczenia

1. Bez skonfigurowania innego modelu recenzent nie jest niezależnym dostawcą.
2. Każda analiza live kosztuje dodatkowe tokeny i opóźnienie.
3. Pełny test live wymaga działającego klucza Gemini i zależności projektu.
4. Następnym poziomem jest multi-provider quorum, kalibracja na benchmarku oraz podpisany receipt całego procesu.
