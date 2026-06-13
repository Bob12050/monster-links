# v8.6-A.14 Mobile Regression Audit

## Scope

- Viewport: 390 x 844
- Main flow: adventure map, stage selection, normal exploration, battle
- Supporting flow: bottom navigation, title start, monster detail modal
- Screens: home, adventure, monsters, dex, fusion, shop, settings, menu, arena, quests, help

## Steps

1. Adventure screen opened with the fixed header and bottom navigation visible.
   - Health: Pass
   - The page body did not scroll. The adventure content scrolled inside the app shell.

2. All 13 stage nodes were selected with pointer press/release.
   - Health: Pass
   - Every stage became the selected stage.
   - The normal exploration button became available for every unlocked, sufficiently leveled stage.
   - Active-state movement stayed within 1-2 pixels instead of jumping away from the pointer.

3. All 13 stage nodes were selected again with touch input in reverse order.
   - Health: Pass
   - Every touch selected the intended stage.

4. Normal exploration was started from Meadow.
   - Health: Pass
   - The button was enabled and the game entered the battle view with battle state present.

5. The four bottom navigation buttons were pressed.
   - Health: Pass
   - Home, Adventure, Monsters, and Menu each opened the expected view.

6. Eleven main screens were checked at mobile height.
   - Health: Pass
   - Body scroll remained zero.
   - Main content used internal scrolling.
   - Bottom navigation remained visible.

7. A monster detail modal was opened.
   - Health: Pass
   - The backdrop stayed fixed.
   - The modal fit inside the viewport and used internal vertical scrolling.

8. The title screen was opened and Start was pressed.
   - Health: Pass
   - Body scroll remained zero and Start returned to Home.

## Fixed Findings

1. Stage buttons could move out from under the pointer while pressed.
   - Cause: the shared button active transform replaced the stage node's positioning transform.
   - Fix: preserve the stage node's translate transform while applying a small press scale.

2. CSS background asset URLs could resolve below `/css/`.
   - Cause: relative URLs stored in custom properties were resolved from the stylesheet.
   - Fix: convert custom-property asset paths to document-based absolute URLs.

3. SVG-only stage and item assets caused avoidable PNG 404 requests.
   - Fix: keep PNG preference for existing art while directly using the five known SVG-only assets.

## Evidence

- `01-adventure-start.png`
- `02-adventure-actions.png`
- `03-battle.png`
- `04-monster-modal.png`
- `audit-results.json`

## Limits

- Automated mobile emulation cannot reproduce every iOS Safari or Android browser gesture.
- Screen-reader announcements and physical-device safe-area behavior require device testing.
