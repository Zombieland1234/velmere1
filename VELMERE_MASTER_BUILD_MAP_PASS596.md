# Velmère master build map — kontynuacja po PASS596

PASS592–596 zamknęły realny proof PDF, uczciwy gate dostępności, przypisy dwukierunkowe, ekstremalną typografię i kapsułę wydania. Następna sekwencja przenosi ten sam rygor do Shield Map, Orbit 360, VLM Brain i całego AI provenance.

## C. Shield Map / Orbit 360

- **PASS597 — multi-snapshot replay:** porównanie bieżącego stanu z kilkoma snapshotami wraz z timestampami i źródłami.
- **PASS598 — visible-node virtualization:** montowanie wyłącznie widocznych i pobliskich węzłów przy presji GPU telefonu.
- **PASS599 — evidence-path isolation:** wybrany węzeł podświetla tylko zależności, cytowania, konflikty i confidence cap.
- **PASS600 — keyboard spatial navigation:** roving focus, strzałki kierunkowe, Enter do inspekcji i Escape do zamknięcia.
- **PASS601 — evidence-only motion:** animowane są wyłącznie rzeczywiste zmiany stanu, bez stałych dekoracyjnych pętli.

### Blockery Shield Map

- drawer nie może odbierać scrolla stronie przed pełnym otwarciem;
- węzły niewidoczne nie mogą utrzymywać drogich filtrów, blurów ani pointer listenerów;
- replay nie może porównywać snapshotów z inną tożsamością instrumentu;
- Basic i Advanced muszą zachować tę samą prawdę, różniąc się wyłącznie głębokością;
- reduced-motion ma zachować pełną informację bez animacji przestrzennej.

## D. VLM Brain

- **PASS602 — source-family graph compression:** grupowanie powtarzalnych sygnałów przed renderem 3D.
- **PASS603 — confidence-cap explainer:** wskazanie dokładnie brakującego dowodu ograniczającego wniosek.
- **PASS604 — contradiction replay:** source-before/source-after, timestamp i powód rozwiązania konfliktu.
- **PASS605 — low-power renderer:** informacyjnie równoważny tryb SVG/canvas dla słabszych telefonów.
- **PASS606 — deterministic Brain-to-PDF handoff:** eksport tych samych claim IDs i tego samego brzmienia bez ponownego generowania prose.

### Blockery VLM Brain

- graf nie może tworzyć wielu wizualnych węzłów dla jednego źródła;
- AI nie może ukrywać limitu pewności pod ogólnym tekstem;
- przejście Brain → PDF nie może zmieniać źródeł, języka ani poziomu 10/14/20;
- tryb low-power nie może usuwać konfliktów ani braków danych;
- animacja wejścia nie może opóźniać pierwszej użytecznej informacji.

## E. Real Markets

- **PASS607 — per-field adapter truth matrix:** live, delayed, stale, fallback i unavailable dla każdej metryki.
- **PASS608 — exchange-health source adapters:** API, depth, withdrawals i reserves pozostają unknown bez źródła.
- **PASS609 — canonical asset identity registry:** stabilne ID, logo, venue, waluta i klasyfikacja aktywa.
- **PASS610 — comfortable/compact density modes:** responsywna gęstość bez poziomego overflow.
- **PASS611 — cross-asset normalized lens:** porównanie zmian i zmienności bez mieszania surowych jednostek.

### Blockery Real Markets

- zakładka Krypto nie wraca do Real Markets; crypto pozostaje w Shield;
- wyszukiwanie nie może filtrować tabeli podczas pisania ani wybierać podobnego symbolu zamiast exact match;
- pojedynczy quote nie może być przedstawiany jako historia świec;
- unavailable nie może zmieniać się w zielony status przez fallback;
- logotyp nie może być ważniejszy od kanonicznej tożsamości instrumentu.

## F. Shared AI Brain i provenance

- **PASS612 — claim provenance IDs:** każde publiczne zdanie mapuje się do faktu, inferencji, konfliktu albo braku danych.
- **PASS613 — deterministic narrative composer:** identyczne dowody dają stabilne brzmienie w Reader, Shield, Map i Brain.
- **PASS614 — uncertainty grammar PL/DE/EN:** jeden słownik confirmed, inferred, stale, conflicted i unavailable.
- **PASS615 — hallucination publication stop-gate:** brak publicznego claim bez źródła albo jawnego łańcucha inferencji.
- **PASS616 — freshness-aware invalidation:** wygasły dowód automatycznie obniża confidence i zmienia wording.
- **PASS617 — source completeness planner:** wybór najbardziej wartościowego następnego sprawdzenia źródła.

## G. Premium UI, motion i performance

- **PASS618 — unified motion tokens:** wspólny czas, easing, dystans i reduced-motion dla wszystkich modułów.
- **PASS619 — interaction latency budget:** pomiar search, chart, modal, drawer, Map i Brain response time.
- **PASS620 — full mobile safe-area sweep:** header, Reader, wykresy, drawer i bottom sheet.
- **PASS621 — containment and repaint audit:** izolacja ukrytych modali, blurów, wykresów i canvasa 3D.
- **PASS622 — hierarchy regression suite:** clipped labels, overlap, contrast i przypadkowe kontenery scroll.

## H. Security i production release

- **PASS623 — public/private diagnostics firewall:** dowody klienta pozostają oddzielone od operator payloadów.
- **PASS624 — API schema and replay gates:** odrzucenie mismatch locale, depth, identity, checksum i lineage.
- **PASS625 — failure fixture suite:** timeout, rate limit, partial history, stale cache i corrupt candle order.
- **PASS626 — clean Node.js 20 release runner:** npm ci, semantic typecheck, Chromium fixtures, Next build i rollback manifest.

## I. Premium parity i release candidate

- **PASS627 — AI answer evidence hover:** ważne zdania ujawniają source IDs bez otwierania debug panelu.
- **PASS628 — PDF/Brain/Map claim parity:** checksum claim IDs oraz lokalizowanego wordingu między powierzchniami.
- **PASS629 — mobile 60 fps pressure gate:** automatyczna redukcja efektów na podstawie realnej presji klatek.
- **PASS630 — source incident recovery UX:** spokojna komunikacja awarii providera bez fake-live fallback.
- **PASS631 — production release candidate:** końcowy cross-surface audit, czysta paczka i deployment checklist.

## J. Po-release intelligence hardening

- **PASS632 — evidence retention policy:** jawny czas życia claim, source receipt i snapshotu.
- **PASS633 — source incident replay:** odtworzenie wpływu awarii providera na wcześniejsze odpowiedzi AI.
- **PASS634 — report revocation receipt:** oznaczenie raportu jako superseded po istotnej zmianie dowodów.
- **PASS635 — multilingual parity corpus:** stały korpus PL/DE/EN wykrywający utratę sensu i angielskie przecieki.
- **PASS636 — proof export bundle:** jeden audytowalny pakiet PDF, claim map, source receipt i render proof.
- **PASS637 — Shield Map stress corpus:** 10/20/50/100 węzłów, słaby telefon i presja pamięci.
- **PASS638 — Brain contradiction corpus:** powtarzalne testy konfliktu, braku źródła i wygasłej informacji.
- **PASS639 — operator rollback drill:** kontrolowane wycofanie adaptera, wordingu lub wydania bez utraty receiptów.
- **PASS640 — zero-fake-data release gate:** finalna blokada produkcji dla syntetycznego live state.
- **PASS641 — Velmère intelligence milestone:** pełny dowód zgodności Reader, PDF, Shield, Map, Brain i Real Markets.

## Natychmiastowa kolejność

1. PASS597–601 — Shield Map replay, wydajność i nawigacja.
2. PASS602–606 — VLM Brain explainability oraz deterministyczny handoff do PDF.
3. PASS607–617 — provider truth i claim-level AI provenance.
4. PASS618–626 — motion, mobile, bezpieczeństwo i czysty Node 20 release.
5. PASS627–641 — cross-surface parity, incident recovery i końcowy milestone.
