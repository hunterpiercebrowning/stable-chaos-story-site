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

## WS7 — Right Tray, Related Strip, Welcome, Background `[ ]`

## WS8 — Backend: Auth, Tracking, Video Token `[ ]`

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

## WS10 — Video Player `[ ]`

## WS11 — Integration, QA, Deploy Docs `[ ]`
