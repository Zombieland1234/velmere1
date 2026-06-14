# PASS386 — Decision Density Engine

Cel passu: większy zakres pracy, ale mniej śmieci w raporcie. PDF nie ma już rosnąć do kilkunastu lub kilkudziesięciu stron tylko dlatego, że projekt ma dużo passów. AI ma wybrać minimalny zestaw danych potrzebny użytkownikowi do następnego kroku.

## Co zmieniono

1. Dodano `lib/market-integrity/pass386-decision-density-engine.ts`.
2. Lens report route dostał `pass386DecisionDensity` jako część jednego resolved report object.
3. Pobrany PDF został ograniczony do 4 stron:
   - Core summary,
   - Decision facts,
   - Evidence + gaps,
   - Next step + trust boundary.
4. Publiczny HTML preview ukrywa legacy pass panels PASS371–PASS385, żeby użytkownik nie widział ściany historii implementacji.
5. Preview pokazuje nową sekcję `PASS386 Decision Density` z wybranymi faktami decyzyjnymi.
6. Guard sprawdza, że PDF nie wrócił do 18 stron i że istnieje kontrakt decyzji.

## Reguła AI

Jeżeli fakt nie zmienia decyzji użytkownika, nie trafia do publicznego PDF.

PDF ma odpowiadać na cztery pytania:

- Co to jest?
- Co realnie widzimy?
- Czego brakuje?
- Jaki jest następny bezpieczny krok?

## Dlaczego to jest ważne

Poprzednie passy dodały dużo infrastruktury, ale raport zaczął przypominać changelog. PASS386 rozdziela:

- wewnętrzną historię implementacji,
- operator/debug rails,
- publiczny raport decyzyjny dla użytkownika.

Użytkownik dostaje krótki raport. Operator dalej może rozwijać pełny system.

## Walidacja

Przeszło:

```bash
npm run verify:pass386-decision-density-engine
npm run check:i18n
npm run vercel:preflight
```

Wynik preflight: 688 plików przeskanowanych.
