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
