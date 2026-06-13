# v8.6-A.25 UI Cleanup Audit

## Scope

- Shop
- Monster encyclopedia
- Mission board
- Mobile portrait viewport: 390 x 844

## Evidence

- `01-shop.png`
- `02-dex.png`
- `03-quest.png`
- `screen-contact-sheet.png`

## Result

- The three screens follow the Crystal Adventure HUD visual language.
- Top HUD and bottom navigation remain fixed.
- Main content scrolls inside the application shell.
- Horizontal overflow is zero on all three screens.
- Shop services and purchase states are readable without opening another panel.
- The encyclopedia opens only the first matching rank by default.
- Mission categories can be expanded independently and reward-ready missions are prioritized.
- No browser console errors or warnings were detected.

## Data Safety

No monster IDs, ranks, stats, recipes, stages, prices, rewards, save schema, or owned-data formats were changed.

final result: passed
