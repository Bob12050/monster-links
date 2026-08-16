# v8.6-A.57 Bright atlas UI design QA

## Comparison target

- Source visual truth: docs/design/v8.6-atlas-ui/reference-home.jpg
- Browser-rendered HOME: docs/design/v8.6-atlas-ui/v857-home-390x632.png
- Required same-input comparison: docs/design/v8.6-atlas-ui/comparison-home-reference-v857.png
- Cross-screen consistency sheet: docs/design/v8.6-atlas-ui/v857-final-screens-contact-sheet.png
- Comparison viewport: 390 x 632 CSS pixels, device scale factor 1.
- Source normalization: the game viewport was cropped from the supplied iPhone screenshot at y=90..1046, excluding iOS and Safari chrome, then resized to 390 x 632 with Lanczos resampling.
- State: HOME / Rank 1 / one-slot starter party / AREA 01. Gold remains live save data and therefore differs between captures.

## Findings

- No actionable P0, P1, or P2 issue remains.
- [P3] Deep gameplay views keep their established information architecture instead of copying the HOME composition literally.
  - Location: Fusion workbench, Quest groups, Shop inventory, Arena cups, Settings, and Help.
  - Evidence: the final contact sheet uses the same ivory paper, cobalt ribbon, blue selection, coral primary action, rounded card, shadow, and atlas background tokens while preserving each view's required controls.
  - Impact: spatial layouts differ by task, but the visual family is immediately recognizable and no functionality is hidden.
  - Follow-up: none required.
- [P3] Monster PNG requests without dedicated production art continue to use the existing game fallback system.
  - Location: long Dex/Fusion lists below the initial viewport.
  - Evidence: no visible broken image exists in the tested viewport, the validator accepts all image/data references, and visible character art resolves normally.
  - Impact: some off-screen entries use the established fallback illustration rather than a unique raster asset.
  - Follow-up: dedicated monster art can be added independently without changing the A.57 UI system.

## Required fidelity surfaces

- Fonts and typography: rounded system Japanese typography, 24 px page titles, 18 px section titles, 13 px body text, 11 px supporting labels, and bold tabular values match the supplied HOME hierarchy without clipped labels.
- Spacing and layout: the 70 px status rail, 30 px cobalt context ribbon, 10 px page gutter, 12 px section rhythm, 17–19 px cards, 44 px minimum controls, and 82 px bottom dock repeat consistently.
- Colors and tokens: ink #294c73, accessible cobalt #176ec5, coral primary #ef654e/#c94634, ivory #fffdf7, warm canvas #f6f1e8, gold rewards, green recovery, and gray disabled states preserve clear semantics.
- Image quality and asset fidelity: HOME and regular screens reuse home_atlas_route_v855.png; stage and monster art remain production assets with correct contain/cover behavior. No new CSS drawing, custom SVG substitute, emoji asset, or placeholder illustration was introduced.
- Shape and surfaces: white paper cards, soft warm dividers, short blue ribbons, circular status icons, light elevation, and raised active dock tiles match the reference instead of the former dark Crystal surface.
- Icons: the existing V.icon() library is retained in the shared HUD and dock; icon sizing, alignment, active color, and accessible button names were checked.
- Copy and content: all live Rank, Gold, party, stage, quest, reward, and save values remain data-driven. No game rules or user data were replaced with mock content.
- Accessibility: visible controls are at least 44 px in the tested viewport, active dock items retain aria-current, focus uses a deep-blue ring plus white halo, reduced-motion behavior remains intact, and header buttons now include live Rank/Gold/party context in their accessible names.

## Full-view comparison evidence

- comparison-home-reference-v857.png places the supplied HOME game viewport and the browser-rendered A.57 HOME in one image at the same 390 x 632 frame.
- The comparison confirms matching full-bleed atlas crop, three-column status rail, AREA ribbon, ivory quest card, circular destination pin, coral exploration CTA, leader placement, three bottom information cards, and five-tab dock.
- The production implementation differs only in dynamic Gold and minute background/leader crop positions.
- v857-final-screens-contact-sheet.png confirms the same surface, token, header, action, and navigation language across HOME, Adventure, Monsters, Fusion, Menu, Quest, Shop, Dex, Arena, and Settings.

## Comparison history

- Pass 1 finding [P1]: every non-HOME screen retained the dark navy Crystal UI, so the title/HOME and the rest of the product appeared to be different games.
  - Fix: appended the scoped A.57 atlas-paper cascade, keeping every versioned root class and callback intact.
- Pass 2 finding [P2]: inherited fixed hero/filter heights clipped Menu, Quest, Dex, Arena, Settings, and Help copy; the HOME main also reserved a 15 px scrollbar gutter.
  - Fix: measured the affected containers, applied high-specificity natural/minimum heights, removed duplicated hero summaries, expanded collapsed filters, and disabled the HOME scrollbar gutter.
- Pass 2 finding [P2]: old semantic button fills overrode the new paper menu cards, and white/dim labels remained unreadable on light cards.
  - Fix: applied exact view-root selectors, semantic border accents, accessible ink colors, and a coral primary CTA.
- Final pass: the source/implementation comparison and ten-screen contact sheet show no remaining clipped content, horizontal overflow, broken visible image, or dark-theme regression.

## Primary interactions tested

- Title primary CTA reaches HOME with the existing first-session lifecycle.
- All five shared dock routes work and supporting views correctly keep Menu selected.
- Adventure Board/Map tabs toggle stageViewMode-*; Normal Exploration enters Battle.
- Battle exposes all six commands, retains no shared HUD/dock, and reaches Result; Result also retains no dock and its navigation actions work.
- Dex filter expands, preserves data-list-filter="dex:q", accepts Japanese input, and filters visible cards.
- Fusion parent picker remains rendered with original IDs/data attributes and the validator confirms its callbacks and recipe filtering contracts.
- Settings/Help native controls and accordions remain reachable.
- Browser console after the full route and interaction pass: no errors or warnings.

## Responsive and implementation checks

- Verified layouts: 320 x 568, 360 x 667, 390 x 632, 390 x 844, 430 x 932, 768 x 1024, and 1024 x 768.
- At every measured size, document width equals viewport width and direct-main horizontal scroll width equals client width.
- At tablet/desktop sizes, the app remains centered at the intended 430 x 932 maximum poster frame.
- Visible interactive controls in the 390 x 844 Fusion pass reported no target below 44 x 44 px.
- Battle/Result direct-main and no-dock lifecycle, stage board/map classes, modal placement, save schema, keys, content IDs, and Game.* callback strings remain unchanged.
- PWA/index/config version is synchronized to v8.6-A.57; no new runtime asset was required.
- Full validator passed: 45 JavaScript files, 84 monsters, 13 stages, 83 fusion recipes, legacy save compatibility, image/data references, primary view generation, and PWA update control.

final result: passed
