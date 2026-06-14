# PASS2008 - commerce / Lookbook / Archive sweep

## Scope
- Shop category and sorting logic.
- Product card interaction and focus behavior.
- Shop empty category state.
- Lookbook composition and caption hierarchy.
- Archive content relevance and localization.
- Mobile sticky-filter and reduced-motion behavior.

## Main changes
- Replaced non-functional Men/Women filters with tag-backed Outerwear, Tops and Bottoms categories.
- Normalized unknown category parameters and added localized empty states.
- Removed the perpetual typewriter state loop from the shop hero.
- Reduced product-card entrance motion and moved focus feedback to cyan.
- Rebuilt Lookbook as a varied editorial image grid with captions over photography.
- Replaced the non-standard Lookbook spacing token with a stable Tailwind scale value.
- Removed the unrelated Bajak Protocol visual from the fashion Archive.
- Replaced the hard-coded English archive disclosure with localized PL/DE/EN copy.
- Added mobile filter containment, solid surfaces and reduced-motion guards.

## Validation
- `npm run verify:pass2008-commerce-lookbook-archive-sweep`
- `npm run verify:pass2007-broad-trust-legal-route-state-sweep`
- `npm run check:i18n`
- `npm run vercel:preflight`

## Visual thesis
Product imagery leads; controls stay dark, compact and operational.

## Interaction thesis
Static product-first hero, real query-backed filters and one-pixel card feedback.
