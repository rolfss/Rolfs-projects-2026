# FJORDSPRINT — Archive Run

A browser racing game: three Norwegian mountain stages, arcade driving, timed runs, quiz boosts, medals, personal-best ghosts, and an original synthesized soundtrack. The game and questions are in Norwegian Bokmål.

## Play

Published address: **https://rolfss.github.io/Rolfs-projects-2026/fjordsprint/**.

### Local copy

The running preview is at **http://127.0.0.1:4173** on this computer.

To start it again on Windows, open **START-FJORDSPRINT.cmd**. Node.js is already installed on the computer where this version was built. If you move the game to another computer, install Node.js LTS from its official website first. Use a current browser with WebGL enabled. Once started, the game uses only local files; opening source links is optional and requires the internet.

For macOS/Linux, run `node launch.mjs` from this folder. For a server without opening a browser, run `node server.mjs`. The server binds only to this computer at 127.0.0.1:4173.

## Controls

| Action | Keyboard |
| --- | --- |
| Accelerate / brake | W / S or ↑ / ↓ |
| Steer | A / D or ← / → |
| Spend boost | Shift |
| Drift and recover a little boost | Space |
| Answer | 1, 2, 3 |
| Restart the whole run | R |
| Return to last checkpoint (+3 seconds) | Enter |
| Pause | Esc or P |
| Chase / bonnet camera | C |
| Full screen | F |

A standard gamepad is supported: left stick to steer, RT/LT to accelerate/brake, A to boost, X to drift, B to recover, Y to restart, Start to pause. During questions: A/X/B select answers 1/2/3. Touch controls appear on touch devices.

Choose **Slik spiller du → Se en demotur** to see driving and quiz boosts in action. Demonstrations do not write records. Choose **Arkivboka → Øv uten tidspress** to practice every question and open its supporting source.

## Rules and progression

- Flying mascots Riksrevisjonen and Arkivverket mark a fixed lane, drop a question package, and reward evasive driving. A hit gives a mandatory 15-second expert question: correct answers trigger four seconds of automatic turbo; wrong answers or timeout reduce speed by 40% and briefly stagger the car.
- Cup medals, stage completion, twelve unique expert answers and total dodges persist locally. Demonstrations do not write progress.
- Sheep, cattle, fenced farms and over a thousand instanced flowers per course add life to the roadsides.
- Three stages: Fjordlinjen (fjord roads), Tindepasset (mountain hairpins), Nordlysryggen (northern twilight).
- Each stage has three quiz checkpoints. Focus slows both driving and the race clock to 15% while the car holds its line. Correct answers add 35% boost; incorrect or skipped answers give feedback without removing speed or boost.
- Drive over the middle of green boost pads to gain 25% boost and a kick of speed. Hold Shift to spend boost. Ramps launch the car; slopes affect acceleration.
- Assisted and Sport steering have separate records. Quiz sets and time-trial mode also have separate records. Settings affecting competition apply to the next race.
- Personal bests and their ghosts are stored only in this browser on this device. Clearing the browser's site data removes them. There are no online accounts, leaderboards, analytics, purchases, or external game assets.
- Gold/silver/bronze targets are calibrated against completed keyboard-style and controller test runs. Fjellcupen opens the next stage when you finish the previous one. Training opens all courses immediately and does not change cup progress.

## Factual basis

The 42 questions and 17 primary sources were checked on **17 September 2026**. They cover archival science, the 2026 archival framework, Noark, access, integrity, provenance, preservation, and professional ethics. Every question has an explanation and an individual source reference in `dist/archive-content.json` and `dist/hard-questions.json`; these are accessible in the game.

The material includes the January 2026 legal transition, Noark's voluntary status, and the separate commencement position of the new archival law's section 11. The explanations are educational summaries; the source library links to the full authoritative texts and their exceptions.

The landscapes and road layouts are fictional interpretations of Norway. This is an independent game, not affiliated with Nasjonalarkivet, Ubisoft, or Trackmania. No Trackmania assets, branding or code are used.

## Included files

`dist/` is the complete game. Everything needed to play is bundled locally. `server.mjs` and `launch.mjs` only serve and open the game on this computer. The development source is readable JavaScript with no build step.

Three.js 0.160.1 is included under its MIT license; see `dist/vendor/THREE-LICENSE.txt`. All course layouts, game logic, procedural models, interface, quiz presentation and generated score were authored for this game.

Version 1.1 includes presentation interpolation at a fixed 120 Hz physics rate, stable shadow anchoring and a cached minimap. Run `npm test` for physics, source, terrain, encounter, progression and interpolation checks.

The named mascots are fictional. Arkivverket became Nasjonalarkivet in 2026; the Riksrevisjonen mascot asks about other public bodies. This game does not represent either institution.
