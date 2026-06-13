# v8.6-A.22 Crystal UI Audit

## Environment

- Viewport: 390 x 844
- Header: fixed 95 px game HUD
- Main area: internal vertical scrolling
- Bottom navigation: fixed 78 px five-tab dock
- Body overflow: hidden
- Horizontal overflow: none on all checked screens

## Checked Screens

1. Adventure board and map
2. Monster party and pasture
3. Fusion selection
4. Monster dex
5. Quest board
6. Shop and item bag
7. Settings and save management
8. Menu
9. Arena
10. Battle transition

## Interaction Checks

- Adventure board/map toggle changes mode.
- Stage cards can be selected.
- An enabled normal adventure starts battle.
- Monster detail modal opens and closes.
- Dex detail modal opens and closes.
- Fusion parent selection updates from 0 to 1.
- Settings sound toggle changes and restores state.
- All five bottom navigation destinations open correctly.
- No browser page errors were observed.

## Visual Evidence

- `01-stage.png`
- `02-monsters.png`
- `03-fusion.png`
- `04-dex.png`
- `05-quest.png`
- `06-shop.png`
- `07-settings.png`
- `08-menu.png`
- `09-arena.png`
- `10-battle.png`
- `screen-contact-sheet.png`
- `comparison-reference-screens.png`

## Data Safety

This release changes presentation hooks and CSS only. Monster IDs, ranks, types,
stats, recipes, stages, save schema, owned-data format, art mappings, and balance
values are unchanged.
