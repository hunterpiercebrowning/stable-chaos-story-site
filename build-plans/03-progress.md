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

## WS2 — What We Believe `[ ]`

## WS3 — Critical Sectors `[ ]`

## WS4 — Services `[ ]`

## WS5 — Products `[ ]`

## WS6 — Left Nav, Search, Keyboard, Presentation Mode `[ ]`

## WS7 — Right Tray, Related Strip, Welcome, Background `[ ]`

## WS8 — Backend: Auth, Tracking, Video Token `[ ]`

## WS9 — Admin UI `[ ]`

## WS10 — Video Player `[ ]`

## WS11 — Integration, QA, Deploy Docs `[ ]`
