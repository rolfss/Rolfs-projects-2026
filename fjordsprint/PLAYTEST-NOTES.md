# FJORDSPRINT 1.1 — validation notes

Validated 18 September 2026 before publication.

- Package checks: JavaScript syntax and local imports, 42 question IDs/options/source references, six complete physics races, road clearance at every metre across all three courses, checkpoint recovery and boost momentum.
- Upgrade regression suite: 38 checks covering presentation interpolation from 30 to 240 Hz (including varying frame times and ramps), locked warning lanes, swept collisions, dodging, exactly-once resolution, teleport recovery, progression migration, unique mastery and turbo/stagger behavior.
- Actual main-module integration: 28 checks with 12 player race/mode combinations and six demonstrations, forced expert questions, wrong and timed-out penalties, deferred turbo, pause/resume, recovery, cup persistence, training isolation and all 42 practice source links.
- Browser: completed Fjordlinjen demonstration in 45.71 seconds with five correct answers and no contacts; no console errors. The test machine reported approximately 144 FPS. Performance varies by device.
- Visual review: desktop 1280 × 720 and narrow 390 × 844 menus; expert quiz readability, mascot models and labels, farm animals and flowers. Shadows can be disabled with the Ytelse graphics setting.

The named characters are original fictional mascots. Source material was checked on 17 September 2026. Gamepad behavior is simulated in tests; no physical gamepad was available for a hardware test.

Local browser progress does not automatically transfer to the public GitHub Pages origin. Public play stores progress in the browser for that origin.

## Version 1.2 validation

- 21 dedicated finish tests across all courses: unchanged timed course geometry; continuous 420 m road extension; independent terrain and mountain clearance; venue props outside the driving corridor; coast-down and actual game result transition.
- Maximum-speed finish stops 209.1 m past the line, leaving over 210 m of road. Records and the race clock freeze at the line; results appear after 2.4 seconds.
- Added permanent runoff, plaza, scenery clearance and finite-transform checks to the package test suite.
- Visually inspected the finish approach and open corridor on all three courses, plus flags and spectators in the running game.
