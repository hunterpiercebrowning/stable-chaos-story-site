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

## WS1 — Who We Are `[ ]`

## WS2 — What We Believe `[ ]`

## WS3 — Critical Sectors `[ ]`

## WS4 — Services `[ ]`

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

## WS6 — Left Nav, Search, Keyboard, Presentation Mode `[ ]`

## WS7 — Right Tray, Related Strip, Welcome, Background `[ ]`

## WS8 — Backend: Auth, Tracking, Video Token `[ ]`

## WS9 — Admin UI `[ ]`

## WS10 — Video Player `[ ]`

## WS11 — Integration, QA, Deploy Docs `[ ]`
