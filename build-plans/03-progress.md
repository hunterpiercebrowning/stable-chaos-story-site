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

## WS4 — Services `[ ]`

## WS5 — Products `[ ]`

## WS6 — Left Nav, Search, Keyboard, Presentation Mode `[ ]`

## WS7 — Right Tray, Related Strip, Welcome, Background `[ ]`

## WS8 — Backend: Auth, Tracking, Video Token `[ ]`

## WS9 — Admin UI `[ ]`

## WS10 — Video Player `[ ]`

## WS11 — Integration, QA, Deploy Docs `[ ]`
