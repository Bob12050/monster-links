**Comparison Target**

- Source visual truth: `docs/design/v8.6-refresh-concepts/option-3.png`
- Browser-rendered implementation: `docs/design/v8.6-refresh-concepts/implementation-v855.png`
- Final same-input comparison: `docs/design/v8.6-refresh-concepts/design-qa-comparison-v855.png`
- Viewport: 390 x 844 CSS pixels, device scale factor 1.
- Source pixels: 852 x 1846. The source was normalized to 390 x 844 with Lanczos downsampling before comparison.
- Implementation pixels: 390 x 844. No browser chrome or device frame was included.
- State: HOME / Rank 1 / Gold 80 / party 1 of 3 slots / AREA 01 `はじまり草原` / recommended Lv.1.

**Findings**

- No actionable P0, P1, or P2 issue remains.
- [P3] The reference guide character carries map equipment, while the implementation deliberately renders the player's live leader monster asset.
  Location: lower-left companion guide.
  Evidence: the reference uses a fixed illustrated guide; the implementation uses the actual saved party leader so the screen stays truthful as the party changes.
  Impact: minor illustration-detail drift, with no layout or usability impact.
  Follow-up: create optional equipment variants for every eligible leader only if exact character styling becomes a later art goal.
- [P3] The regenerated atlas is compositionally matched rather than a pixel-identical copy of the reference terrain.
  Location: full-height map background.
  Evidence: both versions preserve the blue sky, crystal destination, rivers, waterfalls, winding route, blue-roof base, stone route markers, and cyan locked-area rings; individual terrain features differ.
  Impact: no hierarchy or interaction impact.
  Follow-up: none required for this release.

**Required Fidelity Surfaces**

- Fonts and typography: the existing rounded Japanese system font stack is retained. Rank, Gold, party, area title, recommended level, CTA, status cards, and dock labels match the reference hierarchy without clipping or awkward wrapping at 360, 390, and 430 px widths.
- Spacing and layout rhythm: the HUD, area pin/card, companion, three bottom status cards, and five-item dock follow the same vertical order and mobile proportions as the source. At 390 x 844 there is no horizontal or document overflow, and the status cards finish above the persistent dock.
- Colors and visual tokens: ivory paper surfaces, cobalt navigation, cyan map accents, coral exploration CTA, deep-blue text, soft gray dividers, and restrained shadows reproduce the selected light palette with readable contrast.
- Image quality and asset fidelity: the full-bleed atlas is a dedicated raster asset at the correct vertical aspect ratio. Stage art and live monster art use existing production images; no placeholder illustration, emoji, CSS landscape, or custom inline SVG replacement was introduced.
- Copy and content: the visible Japanese copy is coherent and dynamic. Rank, Gold, party capacity, area number/name, required level, unlocked-area progress, leader, and party levels come from current game state rather than baked mock data.
- Icons and states: the project's existing icon library is reused consistently. Active navigation, empty party slots, claimable Rank badge, focus-visible rings, pressed states, and size-aware party slots are implemented.
- Responsiveness and accessibility: verified at 360 x 740, 390 x 844, 430 x 932, and 768 x 1024. Visible buttons are at least 66 x 65 px at the target viewport, all visible buttons have accessible names, all images have `alt`, and keyboard focus indicators are present.

**Full-view Comparison Evidence**

- The normalized full-view pair in `design-qa-comparison-v855.png` shows matched hierarchy, major-region proportions, palette, CTA emphasis, route direction, bottom-card density, and dock placement.
- Important labels and icons remain readable in the normalized pair, so a separate focused crop was not needed. Browser measurements were used to verify exact panel and tap-target bounds.

**Comparison History**

- Pass 1 finding [P2]: the initial atlas preserved the terrain and winding road but omitted the reference's visible stone/cyan progression markers. Evidence: `docs/design/v8.6-refresh-concepts/design-qa-comparison-v855-before-route.png`.
- Fix: regenerated the atlas background with perspective-scaled ivory stone markers along the road and cyan destination rings near the crystal mountain; updated the HOME asset and required PWA cache entry.
- Post-fix evidence: `docs/design/v8.6-refresh-concepts/design-qa-comparison-v855.png`. The route now reads as an explicit 13-area journey while leaving the dynamic area card legible.

**Primary Interactions Tested**

- Title start to HOME.
- HOME dock: Adventure to stage view and Base back to HOME.
- HOME party HUD to party view and Base back to HOME.
- AREA 01 exploration CTA to battle.
- Battle flee action back to stage view, then Base back to HOME.
- Browser console checked after navigation and battle entry: no errors.

**Implementation Checklist**

- [x] Selected option 3 implemented as dynamic HOME UI.
- [x] Full-height raster atlas and route markers installed.
- [x] Existing Rank, Gold, party, stage, leader, and progress state wired in.
- [x] Existing navigation and `Game.*` callbacks preserved.
- [x] Three-slot party sizing preserved for 1/2/3-slot monsters.
- [x] Mobile and tablet breakpoints verified without overflow.
- [x] Primary journey and console verified in the in-app browser.
- [x] PWA version/cache synchronized to v8.6-A.55.
- [x] Full project validator passed.

final result: passed
