# v8.6-A.21 Crystal Adventure HUD Audit

## Environment

- Viewport: 390 x 844
- Screen: home/base
- Body overflow: hidden
- Main content: vertical internal scroll
- HUD height: 95 px
- Bottom dock height: 78 px
- Bottom tabs: 5 columns
- Horizontal overflow: none

## Interaction Checks

- Home tab opens the base screen.
- Adventure tab opens stage selection.
- Party tab opens the monster list.
- Fusion tab opens fusion.
- Menu tab opens menu.
- Rank HUD opens rank rewards.
- Gold HUD opens the shop.
- Party capacity HUD opens the monster list.
- Reward and quest shortcuts open their respective panels.
- The large Adventure button starts the current recommended battle.
- No page errors were observed during these checks.

## Visual Evidence

- `implementation-final.png`
- `comparison-final.png`
- `comparison-hud.png`
- `comparison-dock.png`

## Data Safety

This pass does not modify monster IDs, ranks, types, stats, fusion recipes,
stage definitions, save format, owned-data format, monster roster, or balance.
