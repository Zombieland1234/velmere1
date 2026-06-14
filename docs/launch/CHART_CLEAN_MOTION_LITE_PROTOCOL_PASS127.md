# Velmère PASS 127 — Chart Clean Surface + Motion Lite Protocol

## Fixed from user screenshots

### Chart clutter
The chart still supports dragging left/right, but the visible developer controls were removed:
- `drag chart · history`,
- `older`,
- `newer`,
- `latest`,
- lower duplicate history pill.

### Right-panel decorative rails
The two pill/rail links under the right action panel were removed because they looked like random empty lines.

### VLM brain lag
The VLM orbit is now more conservative:
- default motion starts low and upgrades only on stronger devices,
- memory and CPU cores affect quality,
- auto orbit uses low-frequency interval instead of constant RAF state updates,
- drag still updates the orbit immediately,
- canvas nodes/packets are capped lower,
- animation lifetime is shorter.

## Reality check
This is still not a real WebGL/Three.js 3D scene. It is a lighter CSS/canvas orbit. True smooth 360 object interaction should be a separate Three.js/WebGL pass.
