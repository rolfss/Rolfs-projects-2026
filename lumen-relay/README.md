# Lumen Relay

A compact signal-routing arcade game built for the browser with Canvas 2D, Web Audio and native JavaScript modules.

## Play

After deployment, open:

`https://rolfss.github.io/Rolfs-projects-2026/lumen-relay/`

## Rules

- Collect a glowing signal fragment.
- Deliver it to the gate with the same symbol.
- Complete deliveries quickly to build a score chain.
- Avoid interference or dash through it while protected.
- Survive the full 90-second run.

The symbols—circle, triangle and square—make matching readable without relying on color alone.

## Controls

| Input | Action |
|---|---|
| WASD / arrow keys | Move |
| Space | Dash |
| P / Escape | Pause |
| M | Toggle sound |
| Pointer drag | Steer |
| Double-click / Dash button | Dash |

## Technical outline

- High-DPI responsive Canvas rendering.
- Fixed-duration game loop with capped frame deltas.
- Seeded random helpers and deterministic domain tests.
- Progressive wave and spawn system.
- Particle, trail, glow, screen-shake and score-feedback effects.
- Generated Web Audio cues with no downloaded media.
- Keyboard, mouse and touch input.
- Color-and-shape signal encoding.
- Local best-score and sound preferences.
- Automatic pause when the page is hidden.
- Reduced-motion behavior.
- No framework, build step, API key or external asset dependency.

## Development

Serve the repository root or this directory with a local HTTP server. JavaScript modules do not run correctly from every browser's `file://` mode.

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/lumen-relay/`.

Run the checks with Node 22 or newer:

```bash
cd lumen-relay
npm test
npm run check
```

## Structure

- `index.html` — interface, overlays, HUD and accessible text.
- `styles.css` — responsive layout and visual system.
- `game.mjs` — state machine, input, simulation and rendering.
- `core.mjs` — pure scoring, difficulty, geometry and random helpers.
- `audio.mjs` — generated sound effects.
- `tests/` — automated tests for the pure game rules.
- `DESIGN.md` — gameplay and implementation decisions.

## Data and privacy

The game sends no analytics and makes no network requests. It stores only the local best score and sound preference in the browser.
