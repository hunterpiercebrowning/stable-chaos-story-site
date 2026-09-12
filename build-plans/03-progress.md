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

## WS5 — Products `[ ]`

## WS6 — Left Nav, Search, Keyboard, Presentation Mode `[ ]`

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


## WS8 — Backend: Auth, Tracking, Video Token `[ ]`

## WS9 — Admin UI `[ ]`

## WS10 — Video Player `[ ]`

## WS11 — Integration, QA, Deploy Docs `[ ]`
