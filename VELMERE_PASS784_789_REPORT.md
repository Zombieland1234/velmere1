# PASS784–789 REPORT

## PASS784 — Auth, Wallet, Account and Member

- wallet nie jest wymagany do utworzenia konta;
- konto pokazuje nazwę, e-mail i skrócony adres portfela;
- aliasy login/member/account są zachowane;
- zakładki logowania mają semantykę, obsługę strzałek i prawidłowy tab panel;
- produkcyjny backend auth pozostaje blockerem zewnętrznym.

## PASS785 — Commerce and Collection

- publiczna strona checkoutu odczytuje prawdziwą gotowość środowiska;
- płatność jest guest-first, konto i wallet są opcjonalne;
- Stripe nie uruchamia się bez kompletu sekretów i bramek sklepu;
- informacje o dostawie, zwrotach i fulfilment pozostają wymagane przed startem.

## PASS786 — Square, Community and Research

- publiczny odczyt Square;
- publikowanie wymaga konta;
- nowe treści otrzymują status pending i są moderation-first;
- Community utrzymuje Web3 poza podstawowym zakupem;
- Research pokazuje eksperymentalność, falsyfikację, replikację i granice claimów.

## PASS787 — Accessibility Gate

- auth tabs: tablist, aria-selected, aria-controls, roving tabIndex i klawiatura;
- account navigation: aria-current i kontrolowane regiony;
- widoczny globalny focus ring;
- zachowane Escape/focus restore/scroll lock z PASS756;
- pełny browser accessibility E2E pozostaje niezweryfikowany z powodu polityki Chromium środowiska.

## PASS788 — Performance Gate

- usunięto pełny rerender powierzchni po każdym click/key/scroll;
- wheel/touch starego panelu Shield nie działa już na `document`;
- ciężkie trasy mają lekkie loading shells z reduced motion;
- dalszy bundle profiling wymaga ukończonego production build.

## PASS789 — Full i18n and Responsive Gate

- PL/EN/DE mają zgodne klucze;
- usunięto mieszanie języków w konsoli membera;
- przygotowano test 320/360/390/430 px i kluczowych tras;
- globalna strona blokuje przypadkowy horizontal overflow;
- browser E2E pozostaje blockerem środowiskowym, nie zaliczonym testem.
