# PASS1814–1853 — Cart hard-open runtime repair

Goal: fix the reported issue where the header cart still does not pop up after earlier hydration fixes.

## Root-cause expansion

PASS1774 removed the direct persisted hydration gate, but the cart could still be fragile because opening depended on one Zustand persisted state update and the drawer was closed by route/effect timing. PASS1814 adds an independent local hard-open lane and a capture fallback on the header cart trigger.

## Changes

- `CartProvider` now has a local `forcedOpen` state in addition to the persisted store `isOpen`.
- Public `isOpen` is now `rawIsOpen || forcedOpen`.
- `openCart()` sets `forcedOpen`, marks the UI ready, opens the Zustand store, and confirms the open again on the next animation frame.
- `toggleCart()` no longer depends on the persisted toggle path for opening. It uses the hard-open lane and only uses close for closing.
- `addItem()` also hard-opens the drawer.
- `closeCart()` clears both the local forced state and the store state.
- A capture listener opens the cart when the header cart trigger receives pointerdown, giving a non-React fallback path.
- `CartDrawer` no longer closes on every `closeCart` function identity change. It closes on pathname change through a ref.
- Cart runtime debug is written to `window.__velmereCartRuntime` and emitted as `velmere:cart-runtime`.
- Cart CSS now includes a PASS1814 hard-open visibility lane with stronger drawer z-index rules.

## Why this matters

This is not just a marker. It addresses the ways a cart can fail to visibly open:

1. persisted store hydration delay;
2. store update not reflected in the same frame;
3. route/effect close firing because callback identity changed;
4. header overlay competition;
5. z-index / drawer containment hiding the sheet;
6. click fallback missing on mobile/pointer events.

## Still not claimed

Full browser-click QA is still not proven in this sandbox. The fix is designed to make the next browser test produce a visible sheet or a clear debug payload in `window.__velmereCartRuntime`.
