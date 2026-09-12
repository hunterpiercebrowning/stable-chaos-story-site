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

## WS7 — Right Tray, Related Strip, Welcome, Background `[~]`

**Built**

- `src/components/ContextCard.tsx` + `context-card.css` (prefix `.ctx-`): one card per context item
  type — article (wide thumb, source · date, title, blurb), video (16:9 thumb + play ring), link
  (favicon-style tile, domain from the url, title), pdf (document tile), image (thumb-led with a
  caption overlay), quote (large quote mark, accent rule, attribution). Sector accent via
  `data-sector`. Click → `track('context_item_open', {nodeId, itemType, url})`; items with a url
  open in a new tab (`<a target=_blank>`), video items open the shared `VideoPlayer` expanded,
  url-less items are inert `<article>`s. Generated items carry the "placeholder" label; a `ghost`
  prop gives the dashed, faded, non-interactive preview used by Foundational Background.
- `src/components/ContextCardVideoHost.tsx` — `VideoHost`: portals the unmodified `VideoPlayer`
  to `<body>` inside `.ctx-video-host` (fixed, z 60), sets `videoExpanded` true on mount, fires
  `video_play` (parity with the inline button it bypasses) and calls `onClose` when the flag drops
  (close button, Esc, node change). Only the `role="dialog"` child is shown; the inline poster is
  hidden by CSS. Used by video cards and the welcome ring, so the expanded player covers the whole
  viewport instead of the 320px tray.
- `RightTray`: "Supporting Context" header with a count pill and the focused node's title; cards
  stagger in; the empty state is a dashed panel with a per-layer hint (`HINT` map).
- `RelatedStrip`: same props (`node`, `limit`), `<nav>` with a ruled "Related" head, groups
  labelled by `shortTitle`, chips with a sector-colored glowing dot when the target has a sector,
  secondary-tier chips lighter, `+N` overflow marker. Click → `related_click` + navigate.
- Welcome: gradient wordmark, glowing mark, tagline, "Prepared for {label}" pill from
  `getSession()` (rendered only with a label), pulsing ring "Watch the introduction" → `VideoHost`
  with the placeholder source. Staggered fade-up as on the marketing hero. The up/down arrows are
  the shell's (`StageHeader` / `Stage` footer) — not duplicated.
- Background: eyebrow "Foundational Background · Coming soon" is the stage title; the body is a
  heading, the one-line description and six ghost `ContextCard`s (one per type) in a 3-column
  grid. Falls back to `GenericLayer` as soon as `background-nodes.json` has entries. Up arrow to
  Products is the stage header's.
- `src/lib/session.ts` stub: `getSession(): Promise<{label?, linkId?} | null>`, cached promise,
  `GET /api/session`, null on any error. **WS8's version replaces it.**

**Shared-file appends**

- `src/components/Icon.tsx`: `clock` under a `/* ── WS7 ── */` comment. Nothing else appended
  (no new tokens needed; `src/styles/shell.css` from the brief does not exist — the shell css is
  `src/shell/shell.css`, untouched).

**Decisions / deviations**

1. `videoExpanded` is one global flag, so while a tray video is open a focused node's own inline
   player is also "expanded" underneath the full-viewport host; both close together. Harmless
   today; WS10/WS11 may want a per-instance id if that ever shows.
2. `VideoHost` fires `video_play` itself because it bypasses the player's inline button. If WS10
   tracks play from the expanded body, drop the call in `ContextCardVideoHost.tsx`.
3. Because the stage header already prints the layer title, the Background body does not repeat
   "Foundational Background" as a second h1; it becomes the eyebrow.
4. The "Prepared for" pill keeps a 0.2s fade delay of its own since it mounts when the session
   answers, not at first paint.

**Verified** (headless Chrome over CDP at 1440×900; stub `/api/session` on :8788 for the label)

All six item types render across the who/beliefs nodes · tray count 3 + "placeholder" labels on
generated items · welcome ring and a tray video card both open the expanded dialog and close on
Esc · related strip on `/sectors/synbio`: Sectors/Services/Products groups, dots on every chip,
chip click navigates to `/sectors/biomanufacturing` · `/background`: 6 ghost cards, up arrow
"Explore Products", no down arrow · empty-state hint per layer · no console errors. `typecheck`,
`lint`, `test` (29) and `build` clean.

Screenshots: `build-plans/screens/ws7-welcome.png`, `ws7-tray.png`, `ws7-related.png`,
`ws7-background.png`.

**Left for integration**

- WS8 replaces `src/lib/session.ts`. WS10's player must keep `role="dialog"` on the expanded
  surface (the host hides everything else) and honour `videoExpanded` from the store.
- Real context items: `thumbnail` paths and `url`s are all that's missing; the `link` card derives
  its domain from `url` and falls back to `source`.


## WS8 — Backend: Auth, Tracking, Video Token `[~]`

**Built**

- `migrations/0001_init.sql`: `links · sessions · events` exactly per §5.8 plus the three indexes.
  All timestamps are **epoch milliseconds**.
- `functions/`: `_middleware.ts` (gate), `i/[token].ts`, `api/track.ts`, `api/session.ts`,
  `api/video/token.ts`, `api/admin/{_middleware,login,logout}.ts`, `api/admin/links/{index,[id],[id]/events}.ts`,
  shared `_lib/` (env types, WebCrypto, cookies, D1 row mappers, HTTP helpers, UA class, event
  validation). `functions/tsconfig.json` is referenced from the root `tsconfig.json`, so
  `npm run typecheck` / `npm run build` cover it.
- `src/lib/track.ts` transport (public `track`/`flush`/`setTransport`/`pending` unchanged):
  `POST /api/track` via `sendBeacon` (text/plain, fetch-keepalive fallback), flush every 5s / at 20
  events / on `visibilitychange`→hidden and `pagehide`, `heartbeat` every 30s while visible, one
  `session_start` per page load (deviceClass, viewport, SHA-256 fingerprint-lite of UA+screen+tz+lang,
  tz, lang, referrer). Inert on `/gate` and `/admin*` and outside the browser.
- `src/lib/session.ts`: `getSession(): Promise<{label?, linkId?, sessionId?} | null>`, cached, null on error.
- `wrangler.toml` (Pages config, `DB` binding with placeholder ids, `migrations_dir`),
  `.dev.vars.example`, `scripts/seed-link.mjs`, real `functions/README.md` + `migrations/README.md`.
- Node fallback dev server `scripts/dev-api-node.mjs` (`npm run dev:api:node`) + D1 shim over
  `node:sqlite` (`scripts/_node-d1.mjs`) — see deviations.
- Scripts added to `package.json`: `db:migrate:local`, `db:migrate:remote`, `seed`, `dev:api:node`;
  `dev:api` lost the removed `--local`/`--d1` flags (wrangler 4 reads the toml).
- Tests (16 new, 45 total): cookie sign/verify/tamper/expiry + cross-purpose rejection, UA device
  class, event validation/batch cap, track wire mapping and queue behaviour.

**Integration step for the shell (WS6/WS11)** — one line, anywhere the route is known (e.g. `Stage`
or `AppShell`), so heartbeats carry the current layer/node:

```ts
import { setContextGetter } from '../lib/track';
// inside the component, after useRoute():
useEffect(() => { setContextGetter(() => ({ layerId, nodeId })); }, [layerId, nodeId]);
```

Nothing else is needed: importing `track` starts the transport and sends `session_start`.
Welcome personalization: `const s = await getSession(); s?.label` (WS7's stub has the same signature).

**Cookies** (all `HttpOnly; Path=/; SameSite=Lax`, `Secure` on https)

| Cookie | Value | Life |
|---|---|---|
| `sc_s` | `base64url(linkId.sessionId.iat)` + `.` + base64url(HMAC-SHA256) | 30 days |
| `sc_v` | `base64url(sessionId.verifiedAt)` + `.` + HMAC — last D1 revoke/expiry check | 30 days |
| `sc_admin` | `base64url(admin.iat)` + `.` + HMAC | 12 h |

The HMAC key is `SESSION_SECRET|<purpose>` (`session`/`verify`/`admin`) so one cookie kind can never
verify as another (a test caught exactly that). Tampered/expired `sc_s` → `/gate?r=invalid` and both
investor cookies are cleared.

**Gate** (`functions/_middleware.ts`): public = `/i/*`, `/gate`, `/admin*`, `/api/admin/*`,
`/favicon.svg`, `/assets/fonts/*`, `/assets/logos/*`, `/assets/*.js|css` (see deviation 1). No cookie
→ `302 /gate?r=none`; API paths get `401 {error, reason}` instead of a redirect. Revoke/expiry is
re-read from D1 on **every HTML navigation** (`Sec-Fetch-Dest: document` / `Accept: text/html`) and at
most once per 60s per session for sub-resources and API calls (signed `sc_v`). Gated HTML gets
`Cache-Control: private, no-cache`.

**API contract**

| Route | Request | Response |
|---|---|---|
| `GET /i/:token` | — | `302 /` + `sc_s` + `sc_v`; unknown `302 /gate?r=invalid`, revoked `?r=revoked`, expired `?r=expired`. Creates a `sessions` row (ip_hash = HMAC(ip), geo from `request.cf`, ua, device_class from UA). |
| `POST /api/track` | JSON array (≤50) — or `{events:[…]}` — of `{type, ts, layerId?, nodeId?, props?}`; `text/plain` or JSON body | `204`. Unknown types are dropped silently; >50 → `400`; no session → `401`. `session_start` props `viewport`/`fingerprint`/`deviceClass` update the session row; every batch bumps `last_seen_at`. |
| `GET /api/session` | — | `{label: string|null, linkId, sessionId}` or `401` |
| `GET /api/video/token?uid=<32 hex>` | — | `{token}` RS256 JWT (`sub`=uid, `kid`, `exp` +1h, `nbf`); `400` bad uid; `501 {error}` while `STREAM_*` unset |
| `POST /api/admin/login` | `{password}` | `{ok:true}` + `sc_admin`; `401 {error}` |
| `GET /api/admin/login` | — | `{ok: boolean}` — is the admin cookie valid (for the UI to skip the login form) |
| `POST /api/admin/logout` | — | `{ok:true}`, clears `sc_admin` |
| `GET /api/admin/links` | — | `{links: LinkWithStats[]}` newest first |
| `POST /api/admin/links` | `{label?, notes?, expiresAt?: ms|ISO|null, isInternal?: boolean}` | `201 {id, token, url, link: LinkWithStats}`; `url` uses the request origin |
| `GET /api/admin/links/:id` | — | `{link: LinkWithStats, sessions: (Session & {eventCount})[], summary: {totalEvents, topNodes: [{nodeId, layerId, focusCount, dwellMs}], videos: [{nodeId, plays, maxPct}]}}`; `404` |
| `PATCH /api/admin/links/:id` | `{revoke?: true, reactivate?: true, expiresAt?: ms|ISO|null, label?, notes?, isInternal?}` | `{link: LinkWithStats}`; `400` on empty patch / revoke+reactivate |
| `GET /api/admin/links/:id/events?cursor=&limit=&session=` | limit 1–500 (default 100), `cursor` = `nextCursor` from the previous page, optional session id filter | `{events: [{id, ts, type, layerId, nodeId, props, session: {id, deviceClass, country, region, city}}], nextCursor: string|null}` newest first |

All non-login admin routes return `401 {error}` without `sc_admin`. Shapes:

```ts
LinkWithStats = { id, token, url, label, notes, createdAt, expiresAt, revokedAt, isInternal: boolean,
  status: 'active'|'revoked'|'expired',
  stats: { sessions, opens /* session_start count */, lastSeenAt, distinctIps, distinctFingerprints,
           distinctCountries, forwardSuspect /* distinctFingerprints > 1 || distinctCountries > 1 */ } }
Session = { id, linkId, startedAt, lastSeenAt, ipHash, country, region, city, ua, deviceClass, viewport, fingerprint }
```

**Decisions / deviations**

1. **The Vite bundle is public.** `/gate` and `/admin` are React routes inside the single bundle, and
   that bundle contains the content JSON (imported at build time), so anyone who loads `/gate` can
   read the compiled content. The plan's allowlist (`fonts` + `favicon` only) is not achievable
   without restructuring the app. Suggested WS11 fix: lazy-load `AppShell` (like `AdminApp`) so the
   entry chunk carries no content, then narrow the middleware allowlist to the entry + admin chunks.
   Source maps (`*.map`) and headshots/icons stay gated.
2. **Navigations always hit D1** for the revoke check (plan: "at most once per 60s"). Page loads are
   rare in an SPA, so this costs nothing and makes "revoke → next request → gate" literally true;
   the 60s throttle still applies to assets and `/api/*`.
3. `IP_HASH_SECRET` (already in `.dev.vars.example` from WS0) is honoured when set; otherwise
   `SESSION_SECRET` as the brief says.
4. `device_class` from the client's `session_start` overrides the server's UA guess (the brief says
   session_start updates it); the server guess still fills it for sessions that never send events.
5. `functions/tsconfig.json` sets `strict: true` (the app tsconfigs do not).
6. **workerd cannot run on this Mac** (macOS 13.2 < 13.5 — `wrangler pages dev` and `d1 … --local`
   both refuse to start). `wrangler.toml`, the migrations and `npm run dev:api` are written per the
   docs but were not executed here. To still exercise the real functions end to end I added
   `scripts/dev-api-node.mjs` (Node 22 `--experimental-strip-types`, Pages-style router, static
   `dist/`, D1 shim over `node:sqlite`) plus `npm run seed -- --node`. The transcript
   `build-plans/screens/ws8-auth-loop.txt` was produced against it on :8789 (:8788 was held by
   another workstream's `session-stub.mjs`). WS11 should re-run the loop under real wrangler on a
   supported machine before deploy.

**Verified** (`build-plans/screens/ws8-auth-loop.txt`)

No cookie → `/gate?r=none` (API → 401) · public paths bypass · admin wrong/right password · create
link → `/i/<token>` → `302 /` with `sc_s`+`sc_v` → `/` 200 `private, no-cache` → `/api/session`
returns the label · events via text/plain and JSON → 204, bogus type dropped, 51 events → 400 ·
video token 501/400 · list aggregates, detail summary (top node with 42s dwell, video max 75%),
events pagination with cursor · revoke → next navigation `/gate?r=revoked`, API 401 + cookies
cleared, `/i/<token>` → `?r=revoked` · reactivate + rename → back in · expire → `?r=expired` · clear
expiry → active · tampered cookie → `?r=invalid` · logout → 401. `typecheck`, `lint`, `test` (45),
`build` clean.

**Left for others**

- WS6/WS11: the `setContextGetter` line above. WS7: replace the `getSession` stub with this file.
- WS9: build against the table above; `GET /api/admin/login` tells the UI whether it is already
  logged in. `url` in create/list responses is ready to copy.
- WS10: `fetchStreamToken` already matches `{token}`; Stream needs "Require signed URLs" on the
  video and the key from `POST /accounts/:id/stream/keys` in the two `STREAM_*` secrets.
- WS11: deviation 1 (bundle exposure), re-run the loop under wrangler, `README.md` deploy section
  (`npx wrangler d1 create`, paste ids into `wrangler.toml`, `db:migrate:remote`, four secrets).


## WS9 — Admin UI `[~]`

**Built** (`src/admin/**`, branch `ws/9`)

- `AdminApp.tsx` — nested routes under the existing lazy `/admin/*` mount (no `routes.tsx` change):
  `/admin` login, `/admin/links`, `/admin/links/:id`, unknown → `/admin`. Shell = topbar (wordmark,
  Admin › Links crumb, Sign out) + scrolling main. Renders without the investor gate and never
  touches `/api/session`; any 401 from an admin call bounces to `/admin?next=<path>`.
- `LoginPage` — password → `POST /api/admin/login`; 401 shows an inline error; a valid cookie skips
  the form (it probes `GET /api/admin/links` on mount). Sign out → `POST /api/admin/logout`.
- `LinksPage` — dense table: label (+ Internal tag), created, expires (date + "in 21d"), status
  pill (Active/Revoked/Expired derived client-side from `revokedAt`/`expiresAt`), sessions, opens,
  last seen, devices / locations with a ⚑ when `stats.forwardSuspect`. Every column header sorts;
  default last-seen desc. Row click/Enter → detail. "New link" modal (label, notes, expiry preset
  or date, internal flag) → `POST /api/admin/links` → shows the returned `url` with a copy button.
- `LinkDetailPage` — header (label, status, tags, created/expires/revoked/last-seen, notes),
  controls with inline confirm/edit panels: Revoke / Reactivate (`PATCH {revoked}`), Extend or set
  expiry (`PATCH {expiresAt}`, presets count from the current expiry when still in the future),
  Edit label/notes (`PATCH {label, notes}`). Copyable invitation URL. Forwarding strip (devices ·
  locations · IPs · per-country counts). Sessions table (device class, viewport, short UA,
  city/region/country, first/last seen, event count). Most viewed nodes (title + layer via
  `getNode`, focus count, total dwell). Videos (node, plays, max %).
- `Timeline` — `GET /api/admin/links/:id/events?cursor=&limit=60`, appended page by page and
  regrouped by session (newest session first, newest event first inside). Heartbeats hidden by
  default with a "Show heartbeats (n)" toggle. `format.ts#describeEvent` renders every §6 type:
  "Focused Biosecurity · via nav", "Left Biosecurity · after 42s", "Played Red Teaming video · 80%",
  "Searched 'antenna' · 3 results", "Emphasis → Security", "Opened context item: CSIS article",
  "Related: Cloud Lab → Starling Intel", "Session started · desktop · 1440x900"; unknown types fall
  back to `type key=value`. Ids resolve through `src/data` (`getNode`/`getLayer`), raw id if unknown.
- `api.ts` — one typed function per §5.8 route plus `logout`; normalizes timestamps (accepts
  seconds or ms), string-encoded `props`, and both `{links: [...]}` / bare-array list shapes.
- `mock.ts` — seeded in-memory API: 3 links (Sequoia = forward-suspect with 4 devices/3
  locations, Internal — Hunter, a16z = revoked + expired), 8 sessions, ~330 events across all §6
  types; create/patch/login persist for the page's life (login also in `sessionStorage`).
  Password `admin`. Only reached via a dynamic import behind a build-time constant.
- 12 vitest tests (`src/admin/admin.test.ts`): event sentences, formatters, status derivation,
  mock auth gating, pagination without gaps/dupes, create/patch/revoke.

**Mock mode**

`VITE_ADMIN_MOCK=1 npm run dev`, open `/admin`, password `admin`. The topbar shows a "Mock data"
tag. Verified `npm run build` without the flag: `dist/assets/AdminApp-*.js` contains no fixture or
`mockRequest` code (Vite inlines `import.meta.env.VITE_ADMIN_MOCK` and drops the branch).

**API assumptions for WS8 / integration to confirm** (all in `src/admin/api.ts` comments)

1. Shapes: `GET /api/admin/links` → `{links: AdminLink[]}` (bare array also accepted);
   `POST` → 201 `{link}` incl. absolute `url`; `PATCH /:id` body `{label?, notes?, expiresAt?,
   revoked?: boolean}` → `{link}`; `GET /:id` → `{link, sessions, topNodes, videos, forwarding}`;
   `GET /:id/events?cursor=&limit=` → `{events, nextCursor|null}` newest first, cursor opaque.
2. `AdminLink.stats = {sessions, opens, lastSeenAt, distinctDevices, distinctLocations,
   forwardSuspect}` — the server computes `forwardSuspect` (>1 fingerprint / location / ip_hash).
   `opens` = `/i/<token>` hits (equals `sessions` if every open creates a session).
3. `sessions[]` rows carry `eventCount`; `topNodes = {nodeId, focusCount, dwellMs}` (dwell summed
   from `node_blur`), `videos = {nodeId, plays, maxPct}`, `forwarding = {distinctIpHashes,
   distinctFingerprints, countries: Record<string, number>}`.
4. Field names are camelCase JSON (`createdAt`, `expiresAt`, `revokedAt`, `isInternal`,
   `deviceClass`, `lastSeenAt`); epoch ms preferred, seconds tolerated. `props` may be a JSON
   string or object.
5. `POST /api/admin/logout` exists (not in §5.8; clears `sc_admin`). Errors are `{error: string}`
   with a proper status; 401 anywhere = not signed in.
6. `context_item_open` may include an optional `title` prop for a nicer timeline line; without it
   the UI shows `itemType · hostname`.

**Shared-file appends:** `src/components/Icon.tsx` — one `/* admin (WS9) */` block at the end of
`PATHS` (`copy`, `check`, `plus`, `flag`, `logout`, `refresh`, `edit`, `clock`, `sort-asc`,
`sort-desc`). No `tokens.css` changes (existing tokens sufficed). `routes.tsx` untouched.

**Verified** (headless Chrome over CDP, 1440×900, mock mode): wrong password → error · login →
`/admin/links` (3 rows, ⚑ on Sequoia) · New link → URL shown, row added · row click → detail with
sessions/top nodes/videos/forwarding strip · timeline paginated 5 pages to "Beginning of history"
(250 events, heartbeat toggle) · Revoke → confirm → Revoked → Reactivate → Active · Extend expiry
+90d · Edit label · sort by label · reload keeps session · Sign out → login · direct `/admin/links`
while signed out → `/admin?next=…`. No console errors. `typecheck`, `lint`, `test` (41), `build`
clean. Screenshots: `build-plans/screens/ws9-admin-links.png`, `ws9-admin-new-link.png`,
`ws9-admin-detail.png`, `ws9-admin-timeline.png`.

**Left for integration**

- Run the flow against the real WS8 API and reconcile the shapes above; `api.ts` is the only file
  to touch if names differ.
- The `linkStatus` pill is derived client-side; if WS8 returns a `status` field it can be preferred.
- "Opens" and "sessions" are both shown even though they may be identical in v1.


## WS10 — Video Player `[x]`

**Built**

- `src/lib/video.ts`: `resolveVideoSource(link)` → discriminated union `{kind:'none'} | {kind:'stream', uid}
  | {kind:'r2', key} | {kind:'url', url, mime}`. 32-hex → Stream (lower-cased); any
  `*.cloudflarestream.com` / `*.videodelivery.net` URL with a UID in the path → Stream; `r2:<key>` →
  r2; `http(s)://…` → url with a mime from the path extension (`.mp4/.webm/.m3u8/.mov/.ogv`; unknown
  extension → `mime: ''`, handed to `<video>` anyway); everything else → none. Also
  `streamEmbedUrl()`, `getStreamCustomerCode()`, `requestStreamToken()` (501 → `unconfigured`, any
  other failure → `unavailable`), `resolveStreamPlayback()` (signed token or unsigned-UID fallback),
  `loadStreamSdk()` (injects `https://embed.cloudflarestream.com/embed/sdk.latest.js` once), and the
  pure `progressPct()` / `crossedMilestones()` helpers. `fetchStreamToken()` kept for back-compat.
  15 vitest cases in `src/lib/video.test.ts`.
- `src/components/VideoPlayer.tsx` + `video-player.css`, replacing the WS0 placeholder. Inline: 16:9
  poster (`getPoster` scene in sector color, or the `poster` prop), play glyph, label, and a
  "placeholder" / "not yet available" note for none / r2. Play → the frame grows over the stage
  content area via a motion `layoutId` shared between the inline button and an overlay that is
  **portaled into `.stage-content`** (fallback `.stage`, else in place) so the focus frame's
  `overflow: hidden` / `backdrop-filter` cannot clip it. The media box inside is always a centred 16:9
  (`container-type: size` + `cqh`) and shares a second `layoutId`, so the poster scales uniformly
  instead of stretching. The real player mounts once the layout animation completes (700 ms safety
  fallback); reduced motion → no layoutId, instant swap. Close button, Esc, animate back.
- Stream: `<iframe src="https://customer-<code>.cloudflarestream.com/<tokenOrUid>/iframe?autoplay=true">`
  with `code` from `VITE_STREAM_CUSTOMER_CODE`; no code → `https://iframe.videodelivery.net/<uid>`.
  The token comes from `GET /api/video/token?uid=`; 501 / network error → unsigned UID with a visible
  pill "Signing unavailable — playing unsigned" (plus "Stream is not configured" on 501). Play /
  pause / timeupdate / ended arrive through the on-demand Stream SDK (`window.Stream(iframe)`). Native:
  `<video controls playsinline autoplay>` with `<source type=mime>`; decode failure shows "This video
  could not be played".
- Events via `track()`: `video_play` (each play, with pct), `video_pause` (not on end), `video_progress`
  at 25/50/75 once each per playback session (several at once after a seek), `video_complete` once;
  props `{ nodeId, source, pct }`. Closing mid-play emits a final `video_pause`. For none / r2 a single
  `video_play` (pct 0) records the intent.
- Keyboard while expanded: capture-phase `keydown`/`keyup` on `window` with `stopImmediatePropagation`
  — Space toggles play/pause, Esc closes — so neither the Stage's Esc handler nor WS6's global map
  fires (verified: Esc closes the video and the route stays on the node). Typing targets are ignored.
  Collapsed, the player claims no keys. Focus moves into the frame on open and back to the inline
  button on close.
- The stage header and footer arrow dim to 0.3 while a video is up via
  `.stage:has(.video-expanded) …` in `video-player.css` (Stage.tsx untouched).
- `.env.example` (new) documents `VITE_STREAM_CUSTOMER_CODE`; copy to `.env.local` (git-ignored).

**Final props** (all previous props unchanged; new ones optional)

```ts
interface VideoPlayerProps {
  node: Node;
  link?: string;                 // overrides node.videoLink (welcome intro)
  label?: string;                // inline label, default 'Watch'
  nodeId?: string;               // tracking id, default node.id
  poster?: string;               // default getPoster(node)
  autoplay?: boolean;            // default true, once the frame has settled
  className?: string;
  onExpandedChange?: (expanded: boolean) => void;
}
```

Env: client `VITE_STREAM_CUSTOMER_CODE` (`.env.example`); server `STREAM_SIGNING_KEY_ID` /
`STREAM_SIGNING_KEY_JWK` are WS8's (`.dev.vars.example`).

**Decisions / deviations**

1. Store contract unchanged: `videoExpanded` is mirrored from local state (set *before* `open` so the
   opening render never sees a stale `false`); an external `setVideoExpanded(false)` (Stage close)
   collapses the player, and unmount / node change clears the flag.
2. Non-media `http(s)` links resolve to `url` with an empty mime rather than `none`, so a broken link is
   visible ("could not be played") instead of silently showing a placeholder.
3. R2 is a stub: inline poster + "not yet available" note; expanding shows the same message.
4. No appends were needed to `tokens.css` or `Icon.tsx` (existing `play` / `close` icons and tokens
   suffice).

**Verified** (headless Chrome over CDP at 1440×900, temporary uncommitted `video_link` edits, reverted)

Native mp4 (MDN sample): expands, autoplays, Space pauses/resumes, Esc closes without leaving the
node route; events `video_play → video_progress ×2 → video_pause → video_play → video_pause`. Stream
(Cloudflare's public docs sample UID `b236bde30eb07b9d01318940e5fc3eda`, customer code
`m033z5x00ks6nunl` in `.env.local`): iframe URL built with the customer subdomain, SDK loaded on
demand, plays, "Signing unavailable" pill shown because `/api/video/token` is not served here;
`video_play` and `video_pause` (on close) arrive through the SDK. Welcome placeholder expands with
"no source yet". Reduced motion: frame and player present 60 ms after click, gone 60 ms after Esc.
Header dims to 0.3 while expanded. `typecheck`, `lint`, `test` (44) and `build` clean.

Screenshots: `build-plans/screens/ws10-video-inline.png`, `ws10-video-expanded.png`,
`ws10-video-stream.png`, `ws10-video-placeholder.png`.

**Left for integration**

- WS8: `GET /api/video/token?uid=` → `{ token }`, 501 when unconfigured (the client already handles
  both). Signed playback needs `VITE_STREAM_CUSTOMER_CODE` set in the Pages build env.
- Stage.tsx needs no change. WS11 may replace the `:has()` header-dim rule with a
  `data-video-expanded` attribute on `.stage` if `:has()` support is a concern (Chrome 105+, Safari
  15.4+, Firefox 121+).
- `.env` (without `.local`) is not git-ignored; `.gitignore` is not WS10's — WS11 may want to add it.
- HLS (`.m3u8`) via `<video>` plays natively only in Safari; Stream is the intended path for HLS.
- The Stream player SDK is a third-party script loaded at play time; if a CSP is added later it needs
  `script-src https://embed.cloudflarestream.com` and `frame-src https://*.cloudflarestream.com
  https://iframe.videodelivery.net`.

## WS11 — Integration, QA, Deploy Docs `[ ]`
