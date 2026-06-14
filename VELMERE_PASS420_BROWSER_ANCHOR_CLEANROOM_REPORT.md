# PASS420 — Browser Anchor Cleanroom

Focus: fix the exact Browser screenshot issue before re-enabling heavy Orbit 360.

## Implemented
- Browser/Lens search becomes the first visible control in the hero and is sticky under the nav.
- Suggestions are inline, input-anchored and max-three.
- Suggestions render three rows without an internal scrollbar.
- Suggestion panel and rows use rounded frames.
- Page scroll no longer closes or detaches Browser suggestions.
- Short Velmère Cybersecurity PDF card stays under the search shell.
- Bottom Lens capsule remains the selected-output area: empty prompt first, selected asset after search.
- PASS420 close event added without removing previous PASS419 compatibility.

## Guard
- Orbit 360 remains parked in Real Markets modal until it is isolated behind a lazy crash boundary.
- PDF preview/download parity remains payload-first and locale-bound.
