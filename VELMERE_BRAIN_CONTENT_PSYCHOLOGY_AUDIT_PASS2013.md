# Velmère Brain / Content / Psychology Audit - PASS2013

## Zakres

Audyt objął cały pakiet projektu, ze szczególnym naciskiem na faktycznie wykonywane ścieżki:

- VLM Brain i Gemini provider,
- fallback deterministyczny,
- claim firewall,
- źródła i limit pewności,
- Basic / Pro / Advanced,
- teksty PL / EN / DE,
- psychologię decyzji i anti-FOMO.

Warstwa wizualna, CSS, layout, kolory i animacje nie zostały zmienione.

## Najważniejsze ustalenia

1. Projekt ma rozbudowane zaplecze AI, ale wiele historycznych modułów `pass...` nie steruje bezpośrednio główną odpowiedzią VLM.
2. Faktyczny runtime opiera się głównie na `lib/ai/vlm-brain.ts`, providerze Gemini, fact packet, source arbitration i claim firewall.
3. Wewnętrzny silnik ryzyka był liczony jak osobna rodzina providera. W efekcie jeden feed zewnętrzny mógł wyglądać jak dwa niezależne źródła.
4. Basic / Pro / Advanced różniły się głównie liczbą elementów, a zbyt mało sposobem rozumowania.
5. Fallback był bezpieczny, ale techniczny, powtarzalny i częściowo mieszał języki.
6. Claim firewall blokował zmyślone liczby, ale nie miał równie twardej blokady dla presji, gwarancji i bezpośrednich poleceń transakcyjnych.

## Wdrożone poprawki

- Niezależność źródeł liczy teraz wyłącznie zewnętrzne rodziny providerów.
- Basic prowadzi od najmocniejszego faktu do głównej niepewności i następnej weryfikacji.
- Pro dodaje alternatywne wyjaśnienie, napięcia między metrykami i warunki zmiany pewności.
- Advanced dodaje stres, skutki drugiego rzędu, falsyfikator i dowód o najwyższej wartości decyzyjnej.
- Prompt Gemini chroni autonomię użytkownika: bez presji czasu, scarcity, strachu i social proof.
- System wyraźnie oddziela ruch ceny od jakości i bezpieczeństwa aktywa.
- Fallback otrzymał naturalniejsze etykiety i wyjaśnienia PL / EN / DE.
- Spokojny wynik nie jest przedstawiany jako bezpieczeństwo, a wysoki risk score nie jest przedstawiany jako pewna strata.
- Claim firewall blokuje polecenia kup/sprzedaj, gwarancje, nieudowodnione oskarżenia i emocjonalną presję.
- Błędy providera pozostają w diagnostyce i nie trafiają do publicznej narracji.

## Weryfikacja

- składnia zmienionych plików: PASS,
- VLM safety verifier: PASS,
- prompt injection i secret redaction: PASS,
- i18n PL / EN / DE: PASS,
- scenariusze risk brain: statyczny PASS,
- pełny runtime scenariuszy i build: nieuruchomione z powodu niedostępnych zależności w środowisku,
- historyczny test animacji VLM: istniejący brak markera wizualnego, poza zakresem tego passu.

## Następny logiczny etap

Kolejny pass powinien rozszerzyć te same reguły na Lens PDF, Real Markets i Security Audit, tak aby każda powierzchnia używała jednego kontraktu:

`fakt -> znaczenie -> alternatywa -> luka -> co zmieni ocenę -> następna weryfikacja`
