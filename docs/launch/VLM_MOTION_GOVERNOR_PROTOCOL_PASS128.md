# Velmère PASS 128 — VLM Motion Governor Protocol

## Purpose
The VLM visual brain should not force the heaviest animation path on every device. PASS128 adds a user-facing motion governor with three modes.

## Modes
- **Orbit 360** — full orbital/canvas mode for stronger desktop machines.
- **Lite** — default. Disables heavy canvas, keeps tile orbit and interaction smoother.
- **Static** — no orbit/canvas load; readable evidence cards for weak devices or users who prefer stability.

## What changed
- Default VLM sequence starts in Lite mode.
- Heavy canvas only renders in Orbit 360 when device quality is not low.
- Pro/Advanced no longer show the large basic SVG connector lines by default.
- Debug chart controls stay hidden while drag panning remains active.
- Motion governor controls are visible in the VLM topbar.
- New guard prevents the governor from being removed by accident.

## UX rule
If motion feels laggy, the product should degrade gracefully instead of pretending every user can run a heavy 3D scene.
