# v8.6-A.20 Adventurer Rank Reward Audit

## Scope

- 390 x 844 mobile viewport
- Existing save upgraded to Adventurer Rank 5
- Individual and bulk reward claims
- Duplicate-claim prevention
- Persistence after reload
- Modal-only scrolling

## Result

- All 29 rewards from Rank 2 through Rank 30 were displayed.
- Four rewards were claimable at Rank 5.
- Rank 3 granted 150G and one Force Ring exactly once.
- Bulk claim collected the remaining Rank 2, 4, and 5 rewards.
- Reload preserved all claimed ranks and removed the claimable notice.
- The page body remained fixed while the reward list scrolled internally.
- No page errors were recorded.

See `audit-results.json` and the three mobile screenshots in this directory.
