# PASS647–653 — Visual UI Release

## Zakres

Ten pakiet celowo nie zmienia silnika AI, scoringu, źródeł danych ani endpointów. Prace dotyczą wyłącznie publicznej warstwy produktu: hierarchii, tekstów, stanów interakcji, nakładek, responsywności i ruchu.

## PASS647 — Finite Overlay Constitution

- Globalny header korzysta z istniejącej konstytucji warstw zamiast lokalnego `z-index`.
- Sticky search Shield został sprowadzony poniżej headera.
- Modale Browsera i awaryjny modal Shield są ponad headerem, ale respektują `safe-area`.
- Drawer Shield Map blokuje scroll dokumentu i ma bezpieczne odstępy telefonu.

## PASS648 — Velmère Browser First Impression

- Browser nie otwiera się już jako sama pusta wyszukiwarka.
- Dodano mocny hero, szybkie wejścia BTC / ETH / SOL i trzy jasne etapy użycia.
- Dodano discovery cards widoczne przed pierwszym wyszukaniem.
- Usunięto publiczną ścianę statusów technicznych.

## PASS649 — Browser Modal and PDF Surface Polish

- Wybór Basic / Pro / Advanced, generowanie i podgląd PDF korzystają z jednej warstwy `nestedModal`.
- Górny header nie zasłania już zawartości PDF.
- Poprawiono overscroll, safe-area oraz mobilne położenie sticky search.

## PASS650 — Shield Sorting Interaction

- Dodano osobny, widoczny pasek sortowania: 24h, kapitalizacja, ryzyko, wolumen.
- Każdy przycisk ma jednoznaczny stan aktywny i kierunek strzałki.
- Cykl sortowania: malejąco → rosnąco → domyślne.
- Dodano przycisk resetu i wygodny poziomy scroll na telefonie.

## PASS651 — Shield Public Signal Diet

- Hero Shield dostał krótszą, ludzką hierarchię bez „command room”, operator wall i runtime copy.
- Zamiast technicznej dokumentacji pokazuje trzy kroki: znajdź, zrozum, sprawdź.
- Awaryjny stan renderowania ma spokojny komunikat produktowy.
- Cooldown źródła jest przedstawiony jako chwilowa pauza, nie błąd infrastruktury.

## PASS652 — Shield Map Visual Compression

- Publiczny widok został zredukowany do hero, czterech kroków, wyszukiwania, interaktywnego atlasu i czterech końcowych decyzji.
- Usunięto z renderu długie ściany PASS/runtime/operator/development copy.
- Atlas na telefonie przechodzi do jednej kolumny.
- Karty mają krótsze opisy, mocniejszą hierarchię i wyraźniejszy stan wyboru.

## PASS653 — Motion and Mobile Finish

- Dodano spójne GPU containment dla kart i przycisków.
- Ujednolicono active/hover/focus bez agresywnego FOMO.
- Dodano `prefers-reduced-motion` dla nowych powierzchni.
- Uporządkowano cienie, obramowania, promienie, sticky surfaces i tła Lens / Shield / Map.

## Granica produktu

Silnik AI, kontrakty raportów, endpoint PDF, scoring rynku i adaptery źródeł nie były zmieniane. To świadoma blokada zakresu: najpierw kompletna warstwa wizualna, następnie osobny etap pracy wewnątrz silnika.
