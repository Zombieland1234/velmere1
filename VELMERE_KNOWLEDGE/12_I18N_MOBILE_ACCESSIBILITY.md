# 12 — I18N / MOBILE / ACCESSIBILITY

UPDATED: 2026-09-02 | CLASSIFICATION: NOT_INVESTIGATED in Pas 1

## Locales

| Locale | Supported | Files |
|---|---|---|
| EN | YES (claimed) | messages/ |
| PL | YES (claimed) | messages/ |
| DE | YES (claimed) | messages/ |

(Claim from master mission §39. Actual files NOT enumerated.)

## Mobile / desktop

| Viewport | Tested |
|---|---|
| Desktop | NOT_TESTED |
| Mobile | NOT_TESTED |

## Per master mission §40 — mobile checklist

- navigation
- search
- cards
- tables
- charts
- modals
- filters
- buttons
- forms
- scrolling
- overflow
- PDF actions
- touch targets

## Per master mission §39 — locale checklist

- navigation
- buttons
- errors
- empty states
- dialogs
- reports
- PDFs
- dates
- numbers
- currency
- long strings
- mixed language
- truncation

## Per master mission §41 — accessibility checklist

- semantic structure
- headings
- form labels
- keyboard navigation
- focus
- dialogs
- errors
- ARIA
- interactive target size
- understandable status messages

axe-core is present in devDependencies (4.12.0) — accessibility tooling exists.

## What Pas 6 will add

- Real test EN, PL, DE for navigation, buttons, errors, modals, dates, numbers, currencies
- Real test desktop and mobile viewports
- axe-core accessibility run on major routes
- PDF locale verification

## What will NEVER be claimed

- English works → Polish/German work (test separately per master mission §77)
- Desktop works → mobile works (test separately per master mission §76)
- UI result correct → PDF correct (test separately per master mission §78)
- "i18n parity" without per-locale evidence