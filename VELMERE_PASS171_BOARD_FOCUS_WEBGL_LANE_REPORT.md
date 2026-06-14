# Velmère PASS171 — Evidence Board Focus Polish + WebGL-ready Lane

## Scope
This pass continues the VLM Brain work after PASS170.

## Implemented
- Full-screen Evidence Board now keeps one VLM core only.
- The board mode gets its own overlay class: `shield-vlm-board-mode`.
- Cards are distributed over a larger 3-ring command-board map instead of a cramped two-ring layout.
- Added visual map rings without rendering a second VLM label.
- Added stronger active-card focus, safer z-indexing and darker drawer contrast.
- Added a dependency-free WebGL-ready prototype component that is not imported into the public runtime.

## Important boundary
`VlmBrainWebGLPrototype.tsx` is a safe prototype lane only. It does not import `three`, does not replace the current DOM/CSS brain and does not affect public Shield runtime until intentionally wired.
