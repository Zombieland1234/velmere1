# Velmère Third Pass Report

## What was fixed

### Product size guide
- Removed the global floating size-guide button from the site layout.
- Size guide now belongs to product detail pages only, opened from the product's own “Size guide” button.
- Product size guide now slides from the bottom-right/right corner as a premium side panel instead of appearing as a generic global widget.

### VLM Basic / Pro
- Reworked the VLM Basic / Pro section.
- It is no longer two similar cards sitting next to each other.
- Basic mode now renders one minimal ivory card with short, round, simple lines.
- Pro mode now renders one animated, orbital, technical card with stronger motion and depth.
- Switching Basic/Pro now animates the whole mode card from the screen edge.
- Added a floating Basic/Pro controller: desktop on the right edge, mobile at bottom center.
- The transition overlay is pointer-events-none so it should not block clicks/navigation.

### Velmère Square
- Rebuilt Square toward a feed-style layout inspired by social platforms, without copying them.
- Removed the oversized composer panel.
- Added compact “create post” trigger with a plus-style action.
- Composer opens as a side drawer, not as a giant block in the feed.
- Feed cards are cleaner, more like a premium community timeline.
- Added desktop side rails for context/actions, but public feed stays centered.
- Post detail drawer starts below the header so the header no longer covers opened post content.
- Removed duplicate login-style emphasis from the Square page because login already exists in the header.

## Checks run
- `npm run check:i18n` — passed.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run build` — compiled successfully, but timed out in this container during the later optimization/type validation stage. The project should be tested on local/Vercel with Node 20 as specified in package.json.

## Important notes
- Do not upload `node_modules`, `.next`, `.vercel`, `.env`, or `.env.local`.
- Vercel should use Node 20 because package.json contains `engines: { "node": "20.x" }`.
- If Vercel fails, send the real `Error:` / `Failed to compile` section, not warnings.
