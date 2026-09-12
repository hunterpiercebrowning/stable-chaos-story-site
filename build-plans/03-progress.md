# Progress

One heading per workstream. Each agent appends its handoff note under its own heading when it
finishes: what was built, decisions taken, anything left for integration.

---

## WS0 — Foundation `[x]`

**Built**

- Vite + React 19 + TS scaffold (oxlint as the linter, vitest for tests). Scripts: `dev`, `dev:api`,
  `build`, `preview`, `typecheck`, `lint`, `test`. Vite dev proxies `/api` and `/i` to `:8788`.
- Assets copied into `public/assets/` (Axiforma 300–700, `logos/`, `headshots/`, `favicon.svg`).
- `content/`: the five node files plus `layers.json` and `background-nodes.json` (`[]`), with all
  §0 cleanups applied, `id` on every node, and `content/SCHEMA.md` documenting every field, the
  sector alias table and the context-item shape. `prompts/` untouched.
- `src/data/`: `types · normalize · loader · placeholders · related · search · index`. Public API:
  `getLayers() · getLayer(id) · getNodes(layerId) · getNode(id) · getRelated(id) · search(q, limit)`
  plus `getCopy(node) · getContextItems(node) · getPoster(node) · getPrevLayer/getNextLayer ·
  getPrimarySector · nodeSectors · groupByLayer · placeholderImage/Gallery/Poster · sectorHex`.
  29 vitest tests (`src/data/data.test.ts`) cover normalize, the content itself, placeholders,
  related (including a symmetry invariant) and search ranking.
- `src/store/ui.ts` (`useUi`) exactly per §2, `density`/`leftOpen`/`rightOpen` persisted to
  localStorage under `sc-ui`. `src/store/keyboard.ts` stub (`useKeyboard`, `isTypingTarget`).
- `src/lib/`: `track` (queue + dev console, `setTransport()` for WS8), `video`
  (`resolveVideoSource`, `fetchStreamToken`), `measure` (`useRects`), `cn`.
- Shell: `AppShell · TopBar · LeftNav · RightTray · Stage · StageHeader · LayerArrows ·
  EmphasisControl · DensityToggle · SearchOverlay · MobileBlocker · Attractor · useRoute`.
- Components: `NodeCard · FocusFrame · RelatedStrip · ConnectorLayer · VideoPlayer · Placeholder ·
  Icon (31 line icons) · SectorTag · StageTag`.
- `src/layers/registry.ts` maps all seven layerIds to `{ Layer, Node, Focus }`; `GenericLayer`/
  `GenericNode`/`GenericFocus` render everything today and each per-layer folder re-exports them.
- Routing: `/`, `/:layerId`, `/:layerId/:nodeId`, lazy `/admin/*` stub, static `/gate`
  (`?r=invalid|revoked|expired|none`), unknown → `/`.
- Infra: `wrangler.toml` skeleton (D1 binding `DB`), `functions/` + `migrations/` README stubs,
  `.dev.vars.example`, `.gitignore`, `README.md`.

**Decisions / deviations**

1. **Node ids are globally unique**, because the id is the `:nodeId` URL segment and `getNode(id)`
   is global. Two Services offerings collided with Sectors domains, so they carry their company:
   `molecular-engineering-triangulum-bio`, `operations-fountain-city-partners`. Documented in
   `content/SCHEMA.md`.
2. **Sector primary nodes use the canonical sector id** (`synbio`/`security`/`systems`) rather than
   the kebab of their title, so every cross-layer reference resolves without a lookup table. Their
   display titles are unchanged ("Synthetic Bio").
3. **Normalized nodes are camelCase** (`bulletPoints`, `videoLink`, `relatedSectors`). The content
   JSON stays snake_case; `normalize.ts` is the only translation point.
4. **Dim and collapse are driven through `motion`'s `animate`** in `NodeCard`, not only the CSS
   classes: motion writes inline styles on layout-animated elements and those beat the class.
   `.is-dimmed` / `.is-collapsed` are still applied as styling hooks for the layers.
5. **`order` is optional in the JSON** — the loader assigns the array index when it is absent, so
   Hunter reorders content by moving objects, not by renumbering.
6. Two files legitimately hold hex outside `tokens.css`, both because they feed non-CSS consumers:
   `src/data/placeholders.ts` (SVG data URIs) and `src/shell/Attractor.tsx` (WebGL palette). Both
   carry a comment saying they mirror the tokens.
7. The attractor now **fails soft**: if WebGL is unavailable the effect logs a warning and returns
   instead of throwing (an uncaught throw took the whole app down — found during verification).
8. `npm install` needed `@cloudflare/workers-types@^5` (wrangler 4.131's peer), not `^4`.

**Verified** (headless Chrome at 1440×900, dev server)

Welcome renders with the attractor · the down arrow walks all seven layers in order · all 82 nodes
from all five JSON files focus successfully · empty fields show lorem and generated SVG placeholders
· emphasis dims (never hides) on Sectors/Services/Products — e.g. Security on Products dims 12 of 23
· Compressed collapses the secondary tier on Sectors/Services to zero height and the nav shows
"+18 more" · left nav lists every layer and node · the right tray shows 3 placeholder context items
on focus · the mobile blocker appears below 1024px · `/gate` variants, `/admin` and unknown-route
fallback all behave · no console errors. `typecheck`, `lint`, `test` (29) and `build` are clean.

Screenshots: `build-plans/screens/ws0-welcome.png`, `ws0-layer-sectors.png`,
`ws0-layer-sectors-compressed.png`, `ws0-layer-who.png`, `ws0-layer-products.png` (emphasis),
`ws0-focus-starling.png`, `ws0-mobile-blocker.png`.

**Left for others**

- Every per-layer folder is a re-export of the generic components — WS1–WS5 and WS7 replace the file
  bodies; the registry needs no edit.
- `LeftNav` has no collapsed icon rail, group collapsing or auto-scroll; `SearchOverlay` has no
  keyboard selection or debounced `search` tracking; `keyboard.ts` wires only `/` and `Esc` (WS6).
- `RightTray` uses one generic context card for all six types (WS7).
- `VideoPlayer` is a poster + expanded placeholder, no real playback (WS10).
- `ConnectorLayer` and `useRects` are unused until WS3/WS4 draw connectors.
- `functions/`, `migrations/`, the `track` transport and `/api/session` are WS8's.
- The production bundle is a single ~950 kB chunk (three.js dominates); WS11 can split it.

---

## WS1 — Who We Are `[~]`

**Built** (`src/layers/who/**` only; registry untouched)

- `WhoLayer`: founders row (two larger cards, centered, "Founders" eyebrow) above a presidents row
  (four cards, "Presidents" eyebrow). Founders = `company` kebabs to `stable-chaos` or `role`
  contains "founder"; everyone else is a president. Rows are centered vertically in the stage.
- `WhoNode`: `NodeCard` with custom children — circular 1:1 headshot (124px founder / 88px
  president, `object-position: center top`), name, job title, company as an uppercase label.
  Hover lifts 4px with a `--green-2` glow on the card and a green ring + glow on the headshot.
  `size="lg"` for founders, `"md"` for presidents; presidents also use a lighter glass tint and
  smaller type so they read as subordinate. Missing `headshotFile` → `Placeholder variant="headshot"`.
- `WhoFocus`: `FocusFrame` with media = large soft-rounded headshot (max 340px) over a radial
  `--green-2` glow; eyebrow = company, title = name, subtitle = role, body = blurb (lorem when
  empty via `getCopy`), bullets = resume items, extras = `VideoPlayer` labelled "Meet <first name>".
  Related strip comes from `FocusFrame`/`getRelated` unchanged.
- The `layoutId` default (`node-<id>`) is left intact on both card and frame, so the card still
  grows into the focus frame. `dimmed`/`collapsed` are passed through untouched (always false here).
- CSS: `.who-*` prefix, tokens only. Card overrides of `.node-card` base rules are written as
  `.node-card.who-card…` so they win regardless of stylesheet order.

**Decisions / notes**

1. Row labels ("Founders", "Presidents") were added as ghost-level `sc-label`s — not in the brief,
   but they make the hierarchy legible at a glance with no extra chrome. Easy to drop.
2. The brief says related chips should include "Stable Chaos itself for founders". There is no
   Stable Chaos node in any layer, so `getRelated` (WS0) instead links founders to every company
   — the strip shows the four companies for Hunter/Ben and the single company for each president.
   No data-layer change made; if a Stable Chaos node is ever added, `related.ts` will need an edge.
3. `Placeholder` in the card is `bare` (no "placeholder" tag inside a 88px circle); the focus view
   keeps the dev tag.
4. Chrome extension was not connected; screenshots were taken with headless Chrome
   (`--headless=new --window-size=1440,900 --screenshot`) against `vite --port 5181`.

**Verified**: `typecheck`, `lint` (0 warnings), `test` (29), `build` clean. All six people render
with real headshots; `/who/<id>` focuses each; Related strip resolves the company for presidents.
Screenshots: `build-plans/screens/ws1-who-layer.png`, `ws1-who-focus.png`.

**Shared-file appends**: none (no new tokens or icons needed).

## WS2 — What We Believe `[~]`

**Built** (`src/layers/beliefs/**` only)

- `BeliefsLayer`: a three-column grid — Threats cluster (left, `--threat` peach) · gradient
  divider · Advantages cluster (right, `--advantage` green-2). Each cluster has a faint header
  (dot + "Threats" / "Advantages" + a ghost hint). Cards sit in `.beliefs-slot` wrappers with a
  per-index `alignSelf` + `--ox`/`--oy` nudge (`LEFT_SLOTS`, mirrored for the right) so each side
  reads as a loose cluster leaning toward the divider, not a grid. The offset lives on the wrapper
  because `motion` writes inline transforms on the card for the grow-into-focus transition. Two
  blurred radial fields (`::before`/`::after`) tint each half so the colors meet at the divider,
  which carries a peach→light→green gradient and a small two-tone meeting dot.
- `BeliefsNode`: `NodeCard size="sm"` with custom children — round icon badge, title, and a
  `.tag.beliefs-pill` type pill, all reading `--accent`. Row layout so four cards stack in the
  stage height. Falls back to `GenericNode` for a non-belief node (type narrowing).
- `BeliefsFocus`: `FocusFrame` with `className="beliefs-focus--<type>"` (sets `--accent` so the
  frame gradient, eyebrow and bullet marks take the type color), eyebrow = icon badge + "Threat" /
  "Advantage" · "What We Believe", subtitle = tagline, body = blurb, bullets, extras =
  `<VideoPlayer node />` (existing props only).
- `beliefs.ts`: `beliefIcon(node)` honors the JSON `icon` field when it names a sprite entry,
  else maps by id (trusted-access→key, consilience→consilience, first-principles→atom,
  nth-specificity→crosshair, compute→chip, eroding-knowledge-moats→castle, china→globe), else by
  type (`spark`/`node`). `isBelief` type guard, `BELIEF_LABEL`.

**Shared files:** no appends needed — all seven icons already exist in `Icon.tsx` and
`--threat`/`--advantage` already exist in `tokens.css`. `Icon.tsx`, `tokens.css`, registry,
store, data layer and `VideoPlayer` are untouched.

**Deviations / notes**

1. `node-card.css` sets `.node-card[data-layer='beliefs'] { --accent: var(--advantage) }` for
   every belief. My cards override it with `.node-card.beliefs-node.beliefs-node--threat`, but the
   **focus rail** (`Stage.tsx` → bare `NodeCard size="xs"`) still glows green for threats because
   `NodeCard` emits no type attribute. Suggested shared fix (WS11): have `NodeCard` add
   `data-belief={node.beliefType}` and switch the node-card.css rule to
   `[data-belief='threat'] { --accent: var(--threat) }`. Same for the left-nav active color (WS6).
2. Icon brief said "castle with cracks"; the sprite's existing `castle` has no cracks. Kept it
   rather than appending a near-duplicate.
3. Clusters are top-aligned with a shared `padding-top: clamp(24px, 9vh, 88px)` so both headers
   sit on one line; self-centering each cluster put the headers at different heights.

**Verified** (headless Chrome over CDP, 1440×900, SwiftShader for the attractor): `/beliefs` and
`/beliefs/eroding-knowledge-moats`, plus `/beliefs/trusted-access` scrolled to confirm the video
slot renders under the bullets. Zero console errors from app code. `typecheck`, `lint`, `test`
(29) and `build` clean. Screenshots: `build-plans/screens/ws2-beliefs-layer.png`,
`ws2-beliefs-focus.png`.


## WS3 — Critical Sectors `[~]`

**Built** (`src/layers/sectors/**` only; registry untouched)

- `SectorsLayer`: three Sector bands across the top (3-col grid) and a five-column domain lattice
  beneath: `[synbio] [synbio+security] [security] [security+systems] [systems]`, where the 2nd and
  4th columns are narrower "gutters" that straddle the sector boundaries so dual-sector domains sit
  between their parents. Biosecurity → left gutter; Supply Chain & Logistics and Personnel & Insider
  → right gutter. Cloud Lab (synbio+systems) has no adjacent boundary, so it takes the left gutter
  under Biosecurity and its Systems connector arcs across. Placement is computed
  (`laneOf` → column, stacking index → row), not hand-coded per node.
- `ConnectorLayer` draws one curve per (domain, related sector) in that sector's color — 22 curves —
  inside `.sectors-board` (the `useRects` container). Re-measure: ResizeObserver covers resize and
  the panel-width animation; a layer effect additionally re-measures at 0/200/420/720 ms after any
  emphasis, density or panel change. Verified: closing the tray re-measured the board 788→1107 px
  and the paths moved.
- Emphasis: sectors and domains dim via `useLayerState` (never hidden); a curve is `dimmed` (→ .12)
  when either endpoint is dimmed. Security emphasis dims 13 cards and 15 of 22 curves (Biosecurity,
  Supply Chain and Personnel keep their Security curve, lose the other).
- Density: Compressed collapses the lattice (`max-height`/opacity, NodeCard `collapsed` on every
  domain) and the connector SVG fades to opacity 0 + `visibility: hidden` — paths stay mounted so
  the lines fade with the cards instead of popping. The three bands grow to 124 px so the stage
  isn't empty (motion's `layoutId` animates the size change).
- `SectorsNode`: Sector = `NodeCard size="wide"` with a low-alpha sector-color gradient fill, a 3 px
  solid rule along the top edge and the title alone. Domain = compact card, title + one `SectorTag`
  per sector (wrapping; the split pill clipped in the 130 px gutters at 1440 with both panels open).
  Dual styling in `sectors.css`: border from the first sector, glow from the second, 135° two-stop
  gradient of both; hover wash blends both.
- `SectorsFocus`: eyebrow "Sector"/"Domain" + sector tag(s), title, tagline, blurb, bullets,
  `VideoPlayer` in `extras` (existing props). Dual domains get a second-color radial wash on the
  frame (`.sectors-focus--<second>`). Related strip is FocusFrame's.

**Shared files:** none changed. No edits to `ConnectorLayer`, `useRects`, `tokens.css`, store,
data or VideoPlayer. `SectorsNode` accepts an extra optional `ref` prop on top of `NodeViewProps`.

**Verification:** `typecheck`, `lint`, `test` (29) and `build` clean. Chrome extension was not
connected, so screenshots came from headless Chrome over CDP (script in the session scratchpad) at
1440×900, 0 console errors. Note for anyone screenshotting headless: the attractor's software-WebGL
init stalls the first `requestAnimationFrame` by ~300 ms, and `useRects` measures on rAF, so the
curves land one frame after the cards — wait for `.sectors-connectors path` before capturing.
Real browsers show 9–11 ms.

Screenshots: `build-plans/screens/ws3-sectors-layer.png` (All, Expanded), `ws3-sectors-emphasis.png`
(Security), `ws3-sectors-compressed.png`, `ws3-sectors-focus.png` (`/sectors/biosecurity`).

**Left for integration:** the lattice is one row taller than the stage at 1440×900 with both
panels open (Molecular Engineering / Operations sit at the fold; the layer scrolls). Closing either
panel or presentation mode fits it. If WS11 wants it to fit with both panels open, drop
`.sectors-domain` `min-height` to 64 px or tighten the lattice gap.

## WS4 — Services `[~]`

**Built** (`src/layers/services/**` only; registry untouched)

- `ServicesLayer` — four company cards across the top in the fixed order Growth Curve Bio,
  Triangulum Bio, Starling Intel, Fountain City Partners (SynBio, SynBio, Security, Systems), with
  offerings in a column under their company. `ConnectorLayer` draws a curve from each company to
  each of its offerings in the company's sector colour, measured with `useRects`. Re-measure is
  driven by the hook's ResizeObserver plus settle timers (0 / 360 / 700 ms) on density, emphasis,
  panel and presentation changes and an `onTransitionEnd` on the canvas. The positioned canvas is a
  child of the scroll container so scrolled rects and the SVG share one coordinate space.
- `ServicesNode` — company: `NodeCard` (logo tile from `logoFile`, Triangulum →
  `Placeholder variant="logo"`, name, `SectorTag`) plus a sibling `<a>` website chip (anchors may
  not nest in the card's `<button>`), `target="_blank" rel="noopener noreferrer"`, tracking
  `external_link {nodeId, url}`. Offering: compact `NodeCard` with its own `SectorTag`. A colour
  rule along the top of each company card matches its connectors.
- `ServicesFocus` — company: large logo tile (placeholder keeps its dev tag here), "Company" eyebrow
  with sector tag, tagline, blurb, bullets, `Visit <host>` button + `VideoPlayer` in extras; the
  `FocusFrame` related strip surfaces founders, the president, the sector and the offerings.
  Offering: eyebrow is a button carrying the company's logo and name that navigates to the company
  (tracked as `related_click`), then tagline, blurb, bullets, `VideoPlayer`.
- `WebsiteLink.tsx` (new, in the services folder) shared by node and focus.

**Emphasis / density** — `useLayerState` exactly as `GenericLayer`: non-matching companies and
offerings dim via `NodeCard` (never hidden), the website chip dims with its card, connectors get
`dimmed` when either end is dimmed. Compressed: offerings collapse via `NodeCard collapsed` inside a
`max-height` section that is also `inert`; the connector SVG fades through the existing
`className` prop (`.services-connectors.is-collapsed`).

**Shared-file changes** — none. `tokens.css`, `ConnectorLayer`, `useRects`, `VideoPlayer`, store
and data layer are untouched.

**Decisions / notes**

1. The small logo placeholder on the card is `bare` (the 44px tile cannot hold the dev tag); the
   focus view shows the tag.
2. Expanded at 1440×900 with both panels open scrolls slightly (Starling has seven offerings); the
   layer is an `sc-scroll` container and the connectors stay aligned while scrolling.
3. Verified with headless Chrome over CDP (extension not connected): connector start x/y equals the
   company card centre/bottom before and after toggling the left panel.

Screenshots: `build-plans/screens/ws4-services-layer.png`, `ws4-services-emphasis.png`,
`ws4-services-compressed.png`, `ws4-services-focus-company.png`, `ws4-services-focus-offering.png`.

## WS5 — Products `[~]`

**Built** (`src/layers/products/**` only; branch `ws/5`)

- `ProductsLayer` — three sector bands in `SECTOR_IDS` order (SynBio 11 · Security 8 · Systems 4),
  each with a header (sector label, coloured gradient rule, "N products · A active · P planned") and
  an auto-fill grid of `ProductsNode`s. Emphasis comes from the shared `useLayerState` for the cards
  and dims the band header with the same `.is-dimmed` class; nothing is ever hidden (verified:
  SynBio emphasis dims 12 cards + 2 headers, 0 `display:none`). No density handling — Products
  has none.
- `ProductsNode` — `NodeCard` with the category icon (`bioproduct`/`hardware`/`software`, already
  in the sprite) in the `media` slot as a sector-tinted badge, category as subtitle, and the base
  card's `SectorTag` + `StageTag`. Slated cards get `.products-node--slated`: dashed border, no
  glow, muted title, ghosted icon, "Planned" tag.
- `ProductsFocus` — a `.products-focus` wrapper holds the environment scene (`backgroundImage`, or a
  1600×900 `placeholderImage(variant: 'scene')` seeded by node id) with a left-heavy scrim, and the
  shared `FocusFrame` as a darker glass panel on top (`width: min(100%, max(600px, 66%))`, so the
  scene shows on the right once the stage is wide enough). Eyebrow = category icon + label +
  `SectorTag` + `StageTag`; subtitle = tagline; body = blurb (slated products get a dashed
  "Planned — not yet in market" note first); bullets; extras = `VideoPlayer` (existing props only)
  + gallery strip.
- `ProductsGallery` — 3–5 thumbs (`node.gallery`, else `placeholderGallery(id, sector, 0)` which
  seeds 3–5), each a button that opens the lightbox; placeholder tag shown when generated.
- `ProductsLightbox` — local to this layer. Absolute over the whole `.products-focus` (the same
  region the expanded video covers), blurred backdrop of the current image, image `object-fit:
  contain` filling the figure, prev/next buttons, counter, dot tabs, close. Keyboard: `←`/`→` wrap,
  `Home`/`End`, `Esc` closes. Keys are captured on `window` in the capture phase with
  `stopPropagation` + `preventDefault`, mirroring `VideoPlayer`, so the Stage's Esc handler and
  WS6's map never see them (verified: Esc closes the lightbox and leaves the URL on
  `/products/private-pear`; a second Esc leaves the focus). Focus moves into the dialog on open
  and returns to the previously focused element on close. Lightbox state is keyed by node id so a
  sibling jump from the rail never inherits an open lightbox.
- `categoryIcon.ts` — the `ProductCategory → IconName` map, in its own module so the component
  files export only components (oxlint fast-refresh rule).

**Shared files:** none touched. No tokens or icons were needed — every colour is a token or a
`color-mix` of one, and the three category icons already existed. Registry, shell, store, data
layer and `VideoPlayer` untouched.

**Deviations / notes**

1. The brief's "lightbox reuses the expanded-video area": it covers the same region but does not
   set `videoExpanded` — doing so would make `VideoPlayer` render its own overlay at the same time.
   If WS10 wants a single "something is covering the stage" flag, a separate store field is the
   clean route.
2. The lightbox lives as a sibling of `FocusFrame` (not inside `extras`) because `.focus-frame`
   is `overflow: hidden` and would clip it; that is why `ProductsFocus` owns the index state.
3. Shared-code observation (not fixed, not mine): `FocusFrame`'s `.focus-extras` has
   `max-width: 560px`, which also bounds the gallery strip; fine at 5 thumbs, but a wider strip
   would need that cap lifted or the extras slot to accept a class.
4. Chrome extension was not connected; screenshots were taken with headless Chrome over CDP
   (`--headless=new`, 1440×900) with the persisted UI store at its defaults (Compressed density,
   both panels open). The scratchpad is shared between parallel agents — a first `shot.mjs` was
   overwritten by another workstream mid-run, so the WS5 script is `ws5-shot.mjs`.

**Verified:** `typecheck`, `lint`, `test` (29) and `build` clean. Headless walk: bands
`synbio:11 · security:8 · systems:4`, 11 slated cards; emphasis dims without hiding; active and
slated focus render with the right tags; gallery 5 thumbs; lightbox 2/5 → `→` 3/5 → `←``←` 1/5,
Esc closes, no console errors.

Screenshots: `build-plans/screens/ws5-products-layer.png`, `ws5-products-emphasis.png` (SynBio,
scrolled to show the dimmed Security band), `ws5-products-focus.png` (Private Pear),
`ws5-products-lightbox.png`, plus `ws5-products-focus-slated.png` (Location Lock).

**Left for integration:** nothing required. When real `background_image`/`gallery` paths land,
the "placeholder" tags disappear automatically (they key off the empty fields).

## WS6 — Left Nav, Search, Keyboard, Presentation Mode `[x]`

**Built**

- `src/shell/LeftNav.tsx` + `leftnav.css`: collapsible group per layer (chevron toggle with
  `aria-expanded`; open/closed remembered per group in `useUi().navGroups`; navigating into a
  layer re-opens its group). Layer icon + title + count in each header; primary tier 600-weight,
  secondary tier indented and hidden under Compressed with a "+N more" affordance that switches
  density (and tracks `density_change`). Active layer and node highlighted, active node
  auto-scrolled into view (`scrollIntoView` nearest, honours reduced motion). Collapsed nav is a
  56px icon rail (`--nav-w-collapsed`): search, one icon per layer, expand button; tooltips are
  portalled to `<body>` so the panel's overflow clip cannot swallow them; click navigates.
- `src/shell/SearchOverlay.tsx` + `search-overlay.css`: `role="dialog"`, `aria-modal`, combobox/
  listbox semantics, focus trapped (Tab wraps) and returned to the opener on close. Results from
  `search(q, 24)` grouped in layer order, ↑↓ wrap, Enter opens, Esc closes, mouse hover moves the
  cursor. Matches are wrapped in `<mark>`; body matches show a one-line snippet from the resolved
  copy. `track('search', {q, resultCount})` debounced 400ms, flushed on select/close/unmount so
  a settled query is never lost. Idle state lists the searchable layers; footer shows key hints.
- `src/store/keyboard.ts`: `useKeyboard()` (no args) mounted once in `AppShell`, one capture-phase
  `keydown` listener on `window`. Pure helpers `resolveKeyAction`, `nextSibling`,
  `isTypingTarget`, `isInteractiveTarget` are unit tested (`src/store/keyboard.test.ts`, 6 tests).
- Presentation mode: `AppShell` forces both panel widths to 0 while `presentation` is on (the
  closed nav is otherwise the rail) and the frame drops the top-bar row; `TopBar` renders a
  floating 40px strip with a 14px wordmark (left) and a `P · Exit` chip (right), both at 45–55%
  opacity until hovered. `track('presentation_toggle', {on})` from the toggle button, the chip,
  `P` and `Esc`.
- Icons appended to the sprite: `chevron-left`, `chevron-up`, `home`, `people`, `lightbulb`,
  `grid`, `briefcase`, `box`, `book`.

**Final keyboard map**

| Key | Action |
|---|---|
| `↑` / `↓` | Previous / next layer (clamped at Welcome and Background). Leaves any focused node. |
| `←` / `→` | Previous / next sibling node while a node is focused; first node when none. Clamped, no wrap. |
| `Enter` | Focus the first node on the layer. Left alone when a button/link has DOM focus (native Enter) or a node is already focused. |
| `Esc` | Closes in priority: search → expanded video → focused node → presentation mode. |
| `/` | Open search. |
| `[` / `]` | Toggle left nav (full ↔ icon rail) / right tray. Ignored in presentation mode. |
| `1` `2` `3` `4` | Emphasis All / SynBio / Security / Systems, only on layers with `hasEmphasis`. |
| `P` | Toggle presentation mode. |
| inside search | `↑`/`↓` move, `Enter` open, `Esc` close, `Tab` wraps inside the dialog. |

Every binding except `Esc` is ignored while typing (`isTypingTarget`), while the search dialog is
open, while a video is expanded, and with a Cmd/Ctrl/Alt modifier held.

**Decisions / deviations**

1. **Esc arbitration is centralised** in the capture-phase listener: when it handles an Esc it
   calls `stopPropagation()`, so `Stage`'s own bubble-phase Esc handler never double-navigates and
   Esc inside search no longer also closes the focused node (a WS0 bug). When `videoExpanded` is
   true the hook deliberately does **not** act — `VideoPlayer` owns Esc/Space while expanded — but
   it schedules a `setTimeout(0)` fallback that closes the video only if nothing else did.
2. `useKeyboard` changed signature from `useKeyboard({onSearch, onEscape})` to `useKeyboard()`;
   AppShell was its only caller.
3. The stylesheet named `src/styles/shell.css` in the brief lives at `src/shell/shell.css` (WS0 put
   every shell stylesheet next to its component); edits went there plus `leftnav.css`,
   `search-overlay.css`, `topbar.css`. Also added `.app-panel[aria-hidden='true'] { border-color:
   transparent }` so a panel animated to 0 width does not leave its 1px border behind.
4. `useUi` appends (append-only, nothing renamed): `navGroups: Record<string, boolean>`,
   `setNavGroup(layerId, open)`, `toggleNavGroup(layerId)`. Not added to `partialize` (would have
   meant editing an existing line), so group state is per session.
5. Tracking follows the WS0 pattern: keyboard, nav and search fire their own `layer_view` /
   `node_focus` with `via: 'keyboard' | 'nav' | 'search'`, and `Stage`/`FocusFrame` still fire a
   second `via: 'url'` event on the route change. **For WS11:** either have `Stage` pass a `via`
   into `Focus`/`FocusFrame` (it already accepts one) and drop the URL-side events, or dedupe in
   the transport. Not changed here because `Stage`/`FocusFrame` are outside WS6's ownership.
6. `TopBar`'s presentation button now only *enters* the mode (it is not rendered while on); the
   `togglePresentation` store action is unused but left in place.
7. Verification ran in headless Chrome over CDP (the Chrome extension was not connected); the
   scripted walk-through (`↓×3`, `→ → ←`, `Esc`, `Enter`, `2/4/1/3`, `/ bio ↓↓ Enter`, `Esc Esc`,
   `[` rail + tooltip + click, `]`, group collapse/auto-reopen, "+N more", nav auto-scroll, `P`,
   `Esc Esc`, chip, `↑` to Welcome) passed with zero console errors or warnings.

Screenshots: `build-plans/screens/ws6-nav-expanded.png`, `ws6-nav-rail.png`, `ws6-search.png`,
`ws6-presentation.png` (1440×900).

## WS7 — Right Tray, Related Strip, Welcome, Background `[ ]`

## WS8 — Backend: Auth, Tracking, Video Token `[ ]`

## WS9 — Admin UI `[ ]`

## WS10 — Video Player `[ ]`

## WS11 — Integration, QA, Deploy Docs `[ ]`
