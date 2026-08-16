**Comparison Target**

- Source visual truth: `docs/design/v8.6-title-refresh/option-2.png`
- Browser-rendered implementation: `docs/design/v8.6-title-refresh/implementation-v856.png`
- Final same-input comparison: `docs/design/v8.6-title-refresh/design-qa-comparison-v856.png`
- Comparison viewport: 390 x 844 CSS pixels, device scale factor 1.
- Source pixels: 853 x 1844. The source was normalized to 390 x 844 with Lanczos fitting before comparison.
- Implementation pixels: 390 x 844. No browser chrome or device frame was included.
- State: first-session TITLE / Rank 1 save / AREA 01 destination / no claimable quest reward.

**Findings**

- No actionable P0, P1, or P2 issue remains.
- [P3] The reference uses a highly ornamented illustrated logo crest, while the implementation keeps the existing code-native Monster Links wordmark inside a simpler ivory, cobalt, and gold plaque.
  Location: top title plaque.
  Evidence: the final comparison preserves the same color split, two-line wordmark, hierarchy, position, and footprint, but omits the reference's ribbon wings and gem ornament.
  Impact: minor decorative-detail drift with no readability, layout, or interaction impact.
  Follow-up: a dedicated transparent brand-plaque asset can replace the code-native surface later without changing the title lifecycle.
- [P3] The production monster assets differ in pose from the concept illustration.
  Location: left and right dragon cliffs and lower-left guide.
  Evidence: `prismdragon`, `zenithdragon`, and the live party leader use existing game art rather than newly painted copies of the concept characters.
  Impact: the exact silhouettes differ, while the white-dragon / warm-dragon / guide hierarchy remains intact.
  Follow-up: none required for this release.

**Required Fidelity Surfaces**

- Fonts and typography: the pink `MONSTER`, cyan ampersand, orange `LINKS`, Japanese title, large white start label, gold destination label, notice copy, and version label match the selected hierarchy without clipping or awkward wrapping.
- Spacing and layout rhythm: the plaque, paired dragons, central gateway, guide, primary CTA, notice, and version retain the reference order and measured mobile proportions. At 390 x 844 the major boxes are 324 x 200, 167 x 199, 320 x 113, and 337 x 44 CSS pixels respectively.
- Colors and visual tokens: sky blue, ivory paper, cobalt gateway, gold trim, coral CTA, dark-brown notice, and white/gold text reproduce the selected bright adventure palette with readable contrast.
- Image quality and asset fidelity: the full-bleed atlas and all three monsters use production raster assets. The gateway pin is a dedicated 512 x 640 transparent PNG with a transparent center, so the live destination image remains visible without a fake CSS drawing or placeholder.
- Copy and content: start copy changes between `はじめる` and `スタート`; continue destination, party leader, quest reward notice, and `D.GAME_VERSION` come from live game state.
- Icons and states: the existing scroll icon library is reused. Both title buttons have explicit accessible names, focus-visible rings, pressed feedback, and at least a 44 px mobile tap height.
- Responsiveness and accessibility: verified at 360 x 667, 390 x 844, 430 x 932, and 768 x 1024. Document width equals viewport width at every size, the title has no page scroll, images resolve with nonzero natural dimensions, and the desktop poster remains capped at 430 x 932.

**Full-view Comparison Evidence**

- `design-qa-comparison-v856.png` places the normalized option 2 reference and final browser render together at the same viewport.
- The comparison confirms matched full-screen atlas framing, title-plaque footprint, dragon/gateway/guide order, coral CTA placement, dark notice placement, and version placement.
- The only visible differences are the documented P3 ornament and production-character pose differences.

**Comparison History**

- Pass 1 finding [P2]: the inherited title container reserved a 15 px vertical-scrollbar gutter on the 360 x 667 layout, narrowing every percentage-based child and leaving a dark strip at the right edge.
- Fix: isolated the v8.6-A.56 title from the legacy `titleScreenV82` class and explicitly removed the hidden title scrollbar while retaining the validator contract as data.
- Post-fix evidence: the 360 x 667 document and app both measure 360 px wide; the final 390 x 844 comparison has no right-side gutter or horizontal overflow.

**Primary Interactions Tested**

- Title primary CTA calls `Game.startGame()` and reaches the bright atlas HOME with the existing title-session lifecycle intact.
- Title notice calls `Game.setView('quest')` and reaches the quest screen.
- New title images report complete loading with natural widths of 1024, 1024, 512, and 1024 pixels.
- Browser console checked after initial load, PWA controller update, primary CTA, and quest navigation: no errors or warnings.

**Implementation Checklist**

- [x] Selected option 2 implemented as the dynamic title screen.
- [x] Dedicated transparent gateway asset installed and added to the required PWA cache.
- [x] Existing atlas, monster art, icon library, live destination, party leader, and quest state reused.
- [x] `Game.startGame()`, `Game.setView('quest')`, title session behavior, and view IDs preserved.
- [x] Save schema, save keys, content IDs, battle, rewards, recipes, and balance left unchanged.
- [x] Short mobile, standard mobile, large mobile, and desktop layouts verified without document overflow.
- [x] Keyboard focus produces a visible 4 px white ring with a 3 px offset on the primary CTA.
- [x] PWA/index/config version synchronized to v8.6-A.56.
- [x] Full project validator passed: 45 JavaScript files, 84 monsters, 13 stages, and 83 fusion recipes.

final result: passed
