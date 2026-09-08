# Arkivmuseet — validation and review

## Automated checks

`pnpm test` runs 24 source, content and logic tests. `pnpm build` validates the historical case references, regenerates the complete no-JavaScript text version, checks TypeScript and produces the static Vite build.

`pnpm test:browser` starts its own preview server and runs Chromium through the actual UI. The current suite contains 130 checks:

- All five coherent room stories, investigations and leadership choices.
- Wrong probes, an invalid typed journal search, both weak choices per room, retry paths, wrong quiz answers and explanatory feedback.
- Keyboard activation of the investigation controls and Enter submission of the journal search.
- Both questions in every room, exact badge counts, the locked and unlocked final room, and both final synthesis questions.
- Partial progress across reloads, revisiting completed rooms, source and gallery dialogs, and an actual action-plan download.
- Layout and working controls at 390, 320 and 800 pixels, with text size set to 130%.
- A separate WebGL-unavailable smoke test and the generated no-JavaScript stories and morals.
- Actual 3D geometry and each room's updated exhibit texture, using state obtained from the completed UI journey.

The full 130-check suite and build passed in [GitHub Actions run 34247900716](https://github.com/rolfss/Rolfs-projects-2026/actions/runs/34247900716), on commit `2a2dc3983e2a6970c85710b241ac396aa42b583b`. No browser JavaScript errors or missing application resources were recorded. Later commits are rechecked by the same workflow; use its latest run for their status.

## Visual review

The workflow publishes 16 screenshots plus `results.json` and a built review workbench as the short-lived `museum-review` artifact. Screenshots cover all five 3D exhibits, all five solved inline diagrams, the first badge, the finale, and mobile layouts.

Visual inspection of the first complete run found that older 3D labels obscured portions of the new chapter boards. The boards were moved in front of those labels and server faces, resized to retain approximately the same framing, and given supports. The workflow generates fresh screenshots for reviewing that change.

Software WebGL captures use reduced motion and the existing lower-quality graphics setting. The harness briefly pauses the already-rendered canvas while capturing a screenshot so software rendering does not starve Chromium's compositor. This is a capture technique, not a production performance benchmark.

The production wrapper in `src/world.ts` preserves the museum architecture in `src/world-core.ts`. It limits passive redraws while reading or viewing a stationary exhibit; free movement and camera flights retain the original animation cadence. The frame-budget policy has its own unit test.

## Scope and limits

These checks verify functionality, source structure and selected layouts, not measured learning gains or subjective enjoyment. No target-audience usability study, physical-device performance benchmark, or formal accessibility audit has been performed. The preserved audio and print features are not covered by the new end-to-end suite.

Historical sources, fictional exercises and pedagogical interpretations are labelled separately. Tokke is not represented as proven permanent data loss, missing documentation is not presented as the sole cause of the Hanekleiv collapse, and NPE's metadata finding is not presented as evidence of incorrect compensation decisions.

Changes remain in the existing draft pull request. A passing review workflow does not publish the app to GitHub Pages.
