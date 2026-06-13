**Comparison Target**
- Source visual truth: `docs/design/v8.6-A.21-crystal-adventure-hud-reference.png`
- Implementation: `docs/audits/v8.6-A.21-crystal-hud/implementation-final.png`
- Viewport: 390 x 844 CSS pixels
- State: Home/base screen, default player data
- Full-view evidence: `docs/audits/v8.6-A.21-crystal-hud/comparison-final.png`
- Focused evidence: `docs/audits/v8.6-A.21-crystal-hud/comparison-hud.png` and `docs/audits/v8.6-A.21-crystal-hud/comparison-dock.png`

**Findings**
- No actionable P0, P1, or P2 mismatch remains.
- [P3] Decorative density is lower than the concept.
  Location: top HUD, adventure button frame, bottom dock.
  Evidence: the concept uses bespoke gold filigree and illustrated tab icons; the implementation uses the existing icon set and lighter CSS framing.
  Impact: the implementation is slightly less ornate, but keeps controls readable at 390 px and avoids replacing official project assets.
  Fix: optional future polish can add project-approved ornamental image assets without changing layout or behavior.
- [P3] Hero art direction differs intentionally.
  Location: home hero.
  Evidence: the concept shows a crowned, cloaked slime in a tent camp; the implementation uses the existing official slime art and existing stage background.
  Impact: composition and hierarchy match, while art identity and asset compatibility are preserved.
  Fix: none for A.21. A future art pass should only use approved replacement assets.

**Required Fidelity Surfaces**
- Fonts and typography: hierarchy is preserved with compact HUD labels, prominent Rank, and a large Japanese adventure CTA. Small text remains readable without wrapping.
- Spacing and layout rhythm: fixed 95 px HUD, flexible scrollable main area, and fixed 78 px five-tab dock fit the 390 x 844 viewport without horizontal overflow.
- Colors and visual tokens: navy, cyan, and gold consistently map to the concept's premium adventure palette with adequate foreground contrast.
- Image quality and asset fidelity: official transparent monster artwork remains sharp and correctly scaled. No placeholder art, inline SVG replacement, or emoji asset substitution was introduced.
- Copy and content: Rank, EXP, gold, party capacity, rewards, mission, facilities, and five navigation labels are represented with live game data.

**Patches Made Since Previous QA Pass**
- Forced the bottom navigation into one stable five-column row.
- Restored the official monster art's intended scale and visibility.
- Preserved legacy validation hooks for hub, view context, and research reward text.
- Verified Rank, gold, party, reward, quest, navigation, and adventure interactions.

**Implementation Checklist**
- [x] Premium fixed top HUD
- [x] Large central official monster art
- [x] Primary adventure CTA
- [x] Mission and reward shortcuts
- [x] Fixed five-tab bottom dock
- [x] Internal main-area scrolling only
- [x] Functional first-screen controls
- [x] Mobile portrait visual comparison

**Follow-up Polish**
- Add approved ornamental raster assets in a dedicated art release if more filigree and illustrated tab icons are desired.

final result: passed
