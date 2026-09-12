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

## WS9 — Admin UI `[ ]`

## WS10 — Video Player `[ ]`

## WS11 — Integration, QA, Deploy Docs `[ ]`
