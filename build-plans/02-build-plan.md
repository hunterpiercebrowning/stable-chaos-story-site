# Stable Chaos Pitch Site — Build Plan

Companion to `01-clarifying-questions.md` (all answers locked). This document is the single source
of truth for the build. It is written so that any workstream section can be handed to a fresh agent
with no other context except the files it names.

Status legend: `[ ]` not started · `[~]` in progress · `[x]` merged to main

---

## 0. Locked Decisions (from Q&A)

| Topic | Decision |
|---|---|
| Access model | Tokenized link is the only credential. `/i/<token>` sets a signed cookie. No passphrase. Per-link revoke + expiry. |
| Domain | `context.stablechaos.com` |
| Hosting | Cloudflare Pages + Pages Functions + D1. Free tier; upgrade is a toggle. |
| Video | Cloudflare Stream with signed playback. `video_link` may be a Stream UID, Stream URL, R2 key, plain mp4 URL, or empty. |
| Tracking | Full event set (see §6). IP stored as HMAC hash. Country/region/city from Cloudflare request `cf` object. |
| Admin | `/admin` inside the site, protected by `ADMIN_PASSWORD`. Create/revoke/expire links, per-link sessions, events, top nodes. |
| Personalization | Optional `label` per link, shown on the welcome state ("Prepared for …"). |
| Stack | Vite + React + TypeScript, `motion` for layout transitions, Zustand for UI state, React Router for URLs, plain CSS with tokens, Three.js for the attractor only. |
| Attractor | Carried over. Full on welcome, dimmed behind layers, paused on hidden tab / reduced motion. |
| Git | Full repo on `main`, remote exists. Workstreams run on branches in isolated worktrees and are merged by the orchestrator. |
| Devices | Desktop only. Below 1024px wide show a full-screen "please view on a laptop or desktop" message (still tracked as an open). |
| Layer 6 | "Foundational Background" is a real navigable layer below Products. No node content yet: renders a designed "coming soon" state. Right tray is separately named "Supporting Context". |
| Welcome | Layer 0. Up arrow from Who We Are and logo click return here. |
| URLs | Every layer and node has a URL. Emphasis and density are not in the URL. |
| Related strip | Yes: cross-layer chips under focus content, grouped by layer. |
| Density | Compressed/Expanded affects Sectors (domains) and Services (offerings) only. Default Compressed. |
| Presenter | Keyboard nav (↑↓ layers, ←→ siblings, Enter focus, Esc back, `/` search, `[` `]` panels, `1–4` emphasis, `P` presentation mode). |
| Search | Titles ranked first, then blurb/bullets. Results grouped by layer. |
| Layer view | No layer intro blurb. Layer title in the stage header. Center shows all nodes laid out. |
| Content location | `/content/*.json`, imported at build time. `content/SCHEMA.md` documents fields. |
| Schema additions | `id`, `sector` on primary services, `icon` on beliefs/product categories, `gallery`, `background_image`, `order`. |
| Data cleanups | FCP logo → `fcp-icon.png`; Triangulum → placeholder. Canonical sector ids `synbio/security/systems`, labels SynBio/Security/Systems. Fix typos: "First Principles", "Signals & Spectrum", `stage: "slated"` (loader also accepts `slatted`). |
| Colors | SynBio green `#5A9E6F` · Security orange `#E0945A` · Systems lavender `#9B8ABF` · Threat = peach `#E8B89A` shifted warm · Advantage = green-2 `#7EBF8A` · Active product solid, slated dashed + muted + "Planned" tag. |
| Icons | Line icons in the marketing site stroke style (1.7px, round caps). Bioproduct/Hardware/Software + one per belief. |
| Beliefs lines | None. |
| Context items | Shape in §5.4. v1 shows 3 lorem placeholders per node. |
| Placeholders | Generated brand-colored SVG/gradient placeholders, no external calls. Intro video is a placeholder. |

---

## 1. Architecture Overview

```
context.stablechaos.com
│
├── Cloudflare Pages (static, dist/)          ← Vite build of the React app
│
├── Pages Functions (functions/)
│   ├── _middleware.ts        gate: every request needs a valid session cookie
│   │                          (except /i/*, /gate, /admin*, /api/admin/*, fonts, favicon)
│   ├── i/[token].ts          validate token → set cookie → record session → 302 /
│   ├── api/track.ts          POST batched events (sendBeacon)
│   ├── api/session.ts        GET current session/link (label for personalization)
│   ├── api/video/token.ts    GET signed Stream playback token for a UID
│   └── api/admin/*.ts        login, links CRUD, sessions, events, summaries
│
└── D1 (binding DB)            links · sessions · events
    Cloudflare Stream          private videos, signed URLs
```

### 1.1 Repo layout (created by WS0)

```
content/                      ← Hunter edits these
  layers.json                 layer registry: id, title, shortTitle, order, path, nodesFile, flags
  who-nodes.json  beliefs-nodes.json  sectors-nodes.json  service-nodes.json
  product-nodes.json  background-nodes.json (empty [])
  SCHEMA.md
public/
  assets/ fonts/ logos/ headshots/ icons/     (copied from ./assets and the marketing site)
src/
  main.tsx  App.tsx  routes.tsx
  styles/   tokens.css  base.css  shell.css  motion.css
  data/     types.ts  loader.ts  normalize.ts  placeholders.ts  related.ts  search.ts  index.ts
  store/    ui.ts (zustand)  keyboard.ts
  lib/      track.ts  video.ts  cn.ts  measure.ts
  shell/    AppShell  TopBar  LeftNav  RightTray  Stage  StageHeader  LayerArrows
            EmphasisControl  DensityToggle  SearchOverlay  MobileBlocker  Attractor
  components/ NodeCard  FocusFrame  RelatedStrip  ConnectorLayer  VideoPlayer  Placeholder
              Icon  SectorTag  StageTag
  layers/   registry.ts
            welcome/   who/   beliefs/   sectors/   services/   products/   background/
              each: <Name>Layer.tsx  <Name>Node.tsx  <Name>Focus.tsx  <name>.css
  admin/    AdminApp.tsx  Login  Links  LinkDetail  admin.css
functions/  (see §1)
migrations/ 0001_init.sql
wrangler.toml
README.md
```

### 1.2 Ownership rule
Each workstream owns the directories listed in its brief and may only *append* to shared files
(`tokens.css`, `types.ts`, `ui.ts`, `registry.ts`). Never rename or reformat shared files. This
keeps merges trivial.

---

## 2. Conventions (every agent reads this)

**Code**
- TypeScript strict. Named exports. One component per file. No default exports except route lazies.
- React function components, hooks only. No class components. No `any` without a comment.
- State: URL is the source of truth for `layerId` and `focusedNodeId` (React Router params).
  Zustand `useUi()` holds everything else: `emphasis`, `density`, `leftOpen`, `rightOpen`,
  `presentation`, `searchOpen`, `videoExpanded`. Persist `density`/panel state to `localStorage`.
- Data: only import from `src/data` (`getLayers()`, `getNodes(layerId)`, `getNode(id)`,
  `getRelated(id)`, `search(q)`). Never import JSON directly in a component.
- Tracking: call `track('event_name', props)` from `src/lib/track.ts`. Never fetch `/api/track` directly.
- No new npm dependencies beyond the approved list without stating why in the commit message.
  Approved: `react`, `react-dom`, `react-router`, `zustand`, `motion`, `three`, `@types/three`,
  `vite`, `typescript`, `@vitejs/plugin-react`, `wrangler`, `@cloudflare/workers-types`, `vitest`.

**CSS**
- Plain CSS, one file per component/layer, class prefix per area (`.who-card`, `.sectors-node`).
- Only use color/space/radius/shadow via tokens from `src/styles/tokens.css`. No hardcoded hex.
- Glass surfaces: `background: var(--glass); border: 1px solid var(--glass-border); backdrop-filter: blur(12px)`.
- Type: Axiforma. Headings 600/700, body 400, labels 500 uppercase `letter-spacing: 0.14em`.
- Motion: durations `--dur-fast: 160ms`, `--dur: 320ms`, `--dur-slow: 640ms`; easing
  `--ease: cubic-bezier(.22,.61,.36,1)`. Focus transitions use `motion` `layoutId` on the node card
  so the card visibly grows into the focus frame. Respect `prefers-reduced-motion` (disable layout anims).
- Emphasis dimming: non-matching nodes get `.is-dimmed` → `opacity: .22; filter: saturate(.3)`;
  connectors to them fade to `.12`. Never `display:none` for emphasis.
- Density: Compressed hides secondaries with `.is-collapsed` (height/opacity animate out), not `display:none` until animation ends.

**Accessibility**
- Nodes are `<button>`s. Focus rings visible. Panels have `aria-expanded`. Search is a `role="dialog"`.
- All placeholder images have `alt=""` plus visible small "placeholder" label during dev.

**Git**
- Branch per workstream `ws/<id>-<name>`, small commits, message prefix `[WS#]`.
- Run `npm run typecheck && npm run build` before every commit. Never commit with type errors.
- End every commit message with the attribution lines the session provides.

**Definition of done for any workstream**
1. Acceptance criteria in its brief all pass.
2. `npm run typecheck`, `npm run lint`, `npm run build` clean.
3. Screenshot(s) at 1440×900 saved to `build-plans/screens/<ws>-*.png` (use the run/Chrome tools).
4. Short handoff note appended to `build-plans/03-progress.md` under the workstream heading:
   what was built, decisions taken, anything left for integration.

---

## 3. Phases

```
Phase 0  WS0 Foundation ─────────────────────────────────────────────────┐ (single agent, on main)
                                                                         ▼
Phase 1  parallel, isolated worktrees, one agent each:
         WS1 Who   WS2 Beliefs   WS3 Sectors   WS4 Services   WS5 Products
         WS6 Nav+Search+Keyboard   WS7 Tray+Related+Welcome+Background
         WS8 Backend (functions, D1, auth, tracking, video token)
         WS9 Admin UI   WS10 Video player
                                                                         ▼
Phase 2  WS11 Integration + QA + Deploy docs (single agent, on main)
Phase 3  (later, Hunter) real copy → context items → Foundational Background nodes
```

Merge order after Phase 1: WS8 → WS10 → WS6 → WS7 → WS1..WS5 → WS9. Orchestrator resolves
conflicts (expected only in `ui.ts`, `types.ts`, `tokens.css` appends).

---

## 4. WS0 — Foundation `[ ]`

**Goal:** a running site where every layer and node is reachable with generic rendering, all shell
chrome present, all shared primitives in place, so Phase 1 agents only fill in their slots.

**Owns:** everything. Creates the stubs every later workstream will own.

**Tasks**
1. `npm create vite@latest` (react-ts). Add approved deps. Scripts: `dev`, `dev:api`
   (`wrangler pages dev dist --port 8788 --d1 DB --local`), `build`, `preview`, `typecheck`, `lint`,
   `test`. Vite dev proxies `/api` and `/i` to `:8788`.
2. Copy assets: fonts (`axiforma-300..700.woff2`), `logo-white.svg`, `SC--Logo--White--Horizontal.svg`,
   `favicon.svg` from `../stable-chaos-marketing/assets`; headshots and logos from `./assets` into
   `public/assets/...`. Update paths in content.
3. `content/`: move JSON from `prompts/`, apply the §0 cleanups, add `id` to every node
   (kebab of title, stable), add `sector` to primary services, add `gallery: []`,
   `background_image: ""` to products, add `icon: ""` to beliefs. Add `layers.json`:
   ```json
   [{"id":"welcome","order":0,"title":"Stable Chaos","shortTitle":"Welcome","path":"/","nodesFile":null},
    {"id":"who","order":1,"title":"Who We Are","path":"/who","nodesFile":"who-nodes.json"},
    {"id":"beliefs","order":2,"title":"What We Believe","path":"/beliefs","nodesFile":"beliefs-nodes.json"},
    {"id":"sectors","order":3,"title":"Critical Sectors","path":"/sectors","nodesFile":"sectors-nodes.json","hasEmphasis":true,"hasDensity":true},
    {"id":"services","order":4,"title":"Services","path":"/services","nodesFile":"service-nodes.json","hasEmphasis":true,"hasDensity":true},
    {"id":"products","order":5,"title":"Products","path":"/products","nodesFile":"product-nodes.json","hasEmphasis":true},
    {"id":"background","order":6,"title":"Foundational Background","path":"/background","nodesFile":"background-nodes.json"}]
   ```
   Write `content/SCHEMA.md` documenting every field per file, the sector alias table, and the
   context item shape (§5.4).
4. `src/data`: `types.ts` (discriminated union `Node` = WhoNode | BeliefNode | SectorNode |
   ServiceNode | ProductNode | BackgroundNode, plus `Layer`, `SectorId`, `ContextItem`, `NodeRef`);
   `normalize.ts` (sector aliases, `slatted→slated`, ids, ordering); `placeholders.ts`
   (deterministic lorem seeded by node id: tagline 6–10 words, blurb 45–70 words, 4–6 bullets of
   8–14 words, 3 context items; placeholder image URL generator producing inline SVG data URIs in
   sector color); `related.ts` (compute cross-layer refs: person↔company, company↔sector,
   offering↔company↔sector, product↔sector, domain↔sectors; symmetric); `search.ts` (ranked:
   title prefix > title contains > blurb/bullets contains); `index.ts` public API. Unit tests for
   normalize/related/search with vitest.
5. `src/store/ui.ts` zustand store per §2. `src/store/keyboard.ts` hook stub that WS6 fills.
6. `src/lib/track.ts`: `track(name, props)` queues to memory and logs to console in dev; exports
   `flush()`. WS8 replaces transport only. `src/lib/video.ts`: `resolveVideoSource(link)` →
   `{kind:'stream'|'url'|'r2'|'none', ...}` stub. `src/lib/measure.ts`: `useRects(refs)` hook with
   ResizeObserver for ConnectorLayer.
7. Routing (`routes.tsx`): `/`, `/:layerId`, `/:layerId/:nodeId`, `/admin/*` (lazy, WS9 stub),
   `/gate` (static message page). Unknown → `/`.
8. Shell: `AppShell` grid (left nav | stage | right tray) with collapsible panels (width animates),
   `TopBar` (horizontal wordmark → `/`, layer breadcrumb, `DensityToggle`, panel toggles,
   presentation toggle). `Stage` renders `StageHeader` (up arrow "Explore <prev>", layer title,
   `EmphasisControl` when `hasEmphasis`), the layer component, and bottom down arrow
   "Explore <next>". `LeftNav`: search input (opens `SearchOverlay` stub), layer groups with
   primary/secondary tiers, active states. `RightTray`: header "Supporting Context", list of the
   focused node's context items via a generic card (WS7 restyles). `MobileBlocker` at `<1024px`.
   `Attractor`: port of `main.js` into a component with `intensity` prop (1 on welcome, .35 on
   layers), pause on hidden/reduced motion.
9. Shared components: `NodeCard` (base surface, size variants, `layoutId`, dim/collapsed states,
   `onSelect`), `FocusFrame` (slots: `media`, `eyebrow`, `title`, `subtitle`, `body`, `bullets`,
   `extras`; close button; renders `RelatedStrip` stub and calls `track('node_focus')`/`node_blur`
   with dwell), `ConnectorLayer` (SVG overlay drawing curves between rect pairs, colored, dimmable),
   `VideoPlayer` placeholder (poster + play → expands to fill stage, `videoExpanded` in store),
   `Placeholder` (image/logo/headshot variants), `Icon` (sprite with ~20 line icons), `SectorTag`,
   `StageTag`.
10. `src/layers/registry.ts` maps layerId → `{Layer, Node, Focus}` components. Create a generic
    default layer (`GenericLayer`: responsive card grid of `NodeCard`s; `GenericFocus`: FocusFrame
    with all text fields) and register it for **every** layer so the site is fully navigable.
    Create the per-layer folders with files that simply re-export the generic ones; Phase 1
    replaces file contents without touching the registry.
11. Focus mechanics in `Stage`: when `nodeId` present, render `<Focus>` in the center taking
    ~78% of stage, and a "rail" (`FocusRail`) along the bottom showing sibling nodes as compact
    `NodeCard size="xs"` (still dimmable by emphasis) for jumping. Esc / close → layer route.
12. `wrangler.toml` skeleton, `functions/` and `migrations/` empty dirs with README stubs,
    `.gitignore`, `README.md` (dev commands). `.dev.vars.example`.
13. Verify in browser: every layer, every node, both panels, density, emphasis, arrows, welcome.

**Acceptance**
- `npm run dev` → welcome state with attractor; clicking down arrow walks all seven layers.
- Every node from every JSON appears and can be focused; all empty fields show lorem/placeholders.
- Emphasis dims correctly on layers 3–5; density hides secondaries on 3–4.
- Left nav lists all layers/nodes; right tray shows 3 placeholder items when a node is focused.
- Typecheck, lint, build, tests clean. Committed to `main`.

---

## 5. Phase 1 Workstreams

Each brief below is self-contained. Prelude for every Phase 1 agent:
> Read `build-plans/02-build-plan.md` §0, §2 and your own section. Read `content/SCHEMA.md`,
> `src/data/types.ts`, `src/store/ui.ts`, `src/components/NodeCard.tsx`, `FocusFrame.tsx`, and
> the marketing site `../stable-chaos-marketing/style.css` for visual reference. Work only in the
> paths you own. Run the site and screenshot before finishing.

### 5.1 WS1 — Who We Are `[ ]`
**Owns:** `src/layers/who/**`.
**Layout:** Row 1: two founder cards, larger, centered. Row 2: four president cards. Cards: headshot
(circular or soft-rounded, 1:1), name, title, company as a small label. Hover lifts + glow in
`--green-2`.
**Focus:** `FocusFrame` with media = large headshot on the left (with soft radial glow), eyebrow =
company, title = name, subtitle = title, body = blurb, bullets = resume items, extras = optional
video placeholder. Related chips: company service node, Stable Chaos itself for founders.
**Acceptance:** matches brief; presidents visually subordinate to founders; missing headshots use
`Placeholder variant="headshot"`.

### 5.2 WS2 — What We Believe `[ ]`
**Owns:** `src/layers/beliefs/**`, plus new icons appended to `Icon` sprite (append only).
**Layout:** Two clusters. Threats left (peach/warm), Advantages right (green-2). Each cluster has a
faint header label ("Threats", "Advantages"). Nodes: icon + title + type pill. Slight organic
offset so it reads as a cluster, not a grid. A subtle center divider or gradient meeting line.
**Icons:** choose one per belief (Trusted Access→key/shield, Consilience→converging lines,
First Principles→atom, Nth° Specificity→crosshair, Compute→chip, Eroding Knowledge Moats→castle
with cracks, China→globe/flag-neutral). Add to sprite.
**Focus:** title, tagline, blurb, bullets, and `VideoPlayer` in `extras` that expands to fill stage.
**Acceptance:** cluster split obvious at a glance; type color consistent in nav, card, focus.

### 5.3 WS3 — Critical Sectors `[ ]`
**Owns:** `src/layers/sectors/**`.
**Layout:** Three primary "Sector" nodes across the top: wide, short, filled with their sector color
at low alpha and a solid color rule. Secondary "Domain" nodes below, positioned in columns beneath
their sector; dual-sector domains (Biosecurity, Cloud Lab, Supply Chain & Logistics, Personnel &
Insider) sit between their two parents. `ConnectorLayer` draws curves from each domain to each
related sector in the sector's color.
**Dual styling:** border color from first sector, shadow/glow from second, background tinted by a
2-stop gradient of both.
**Emphasis:** non-matching sectors and domains dim; connectors fade.
**Density:** Compressed collapses all domains (connectors hide) so only three sectors remain.
**Focus:** title, tagline, blurb, bullets, video. Related: for a sector, its domains, services,
products; for a domain, its sectors.
**Acceptance:** lines re-measure on resize/panel toggle; dual-sector nodes readable.

### 5.4 WS4 — Services `[ ]`
**Owns:** `src/layers/services/**`.
**Layout:** Four company nodes on top (logo, name, URL as small external link, `SectorTag`). Offering
nodes below, grouped in columns under their company, each with a `SectorTag`, connected by lines in
the company's sector color. Companies ordered SynBio, SynBio, Security, Systems for a clean color
sweep.
**Emphasis** dims by sector. **Density** collapses offerings.
**Focus:** company focus shows logo large, website button, blurb, bullets, video, related =
offerings + president + sector. Offering focus shows company eyebrow, blurb, bullets, video.
**Acceptance:** Triangulum uses `Placeholder variant="logo"`; URLs open new tab with
`track('external_link')`.

### 5.5 WS5 — Products `[ ]`
**Owns:** `src/layers/products/**`, category icons appended to sprite.
**Layout:** Three sector bands (SynBio 11, Security 8, Systems 4), each band with a colored header
rule and a grid of product nodes. Node: category icon top-left, title, `SectorTag`, `StageTag`
(Active solid / Planned dashed+muted). Emphasis dims other bands.
**Focus:** background environment photo (placeholder gradient scene) fills the frame behind a glass
panel; title, tagline, blurb, bullets, video; `gallery` as a 3–5 thumb strip (placeholders) with a
lightbox that reuses the expanded-video area.
**Acceptance:** active vs planned unmistakable; gallery keyboard navigable.

### 5.6 WS6 — Left Nav, Search, Keyboard, Presentation Mode `[ ]`
**Owns:** `src/shell/LeftNav*`, `src/shell/SearchOverlay*`, `src/store/keyboard.ts`,
`src/shell/TopBar*` (presentation toggle only).
**Nav:** collapsible groups per layer, primary tier bold, secondary tier indented and hidden when
Compressed (with a "+N more" affordance that switches density). Active node highlighted, auto-scroll
into view. Collapsed nav = icon rail with tooltips.
**Search:** `/` or click opens overlay; instant results grouped by layer; ↑↓ Enter navigate;
`track('search', {q, resultCount})` debounced.
**Keyboard:** the §0 map. Ignored when typing in inputs.
**Presentation mode:** collapses both panels, hides top bar chrome except a tiny wordmark and a
`P` exit chip; `Esc` exits.
**Acceptance:** whole site drivable from the keyboard; no key conflicts with video player.

### 5.7 WS7 — Right Tray, Related Strip, Welcome, Background `[ ]`
**Owns:** `src/shell/RightTray*`, `src/components/RelatedStrip*`, `src/components/ContextCard*`,
`src/layers/welcome/**`, `src/layers/background/**`.
**Tray:** "Supporting Context" header with count; `ContextCard` per type (article: source + title +
blurb; video: thumb + play (uses `VideoPlayer` expanded); link: favicon-style icon + domain; pdf;
image; quote). Empty focus → shows layer-level hint text. `track('context_item_open')`.
**Related strip:** chips grouped by layer with layer short titles; click navigates;
`track('related_click')`.
**Welcome:** logo mark (from marketing hero, with glow), "Stable Chaos", tagline "Advancing Critical
Sectors & Missions", "Prepared for {label}" from `/api/session` (graceful when absent), subtle
pulsing ring "Watch the introduction" → `VideoPlayer` expanded placeholder. Down arrow "Explore Who
We Are". Attractor at full intensity.
**Background layer:** designed "coming soon" state: title, one-line description of what the layer
will hold, six ghosted placeholder source cards. Up arrow back to Products.
**Acceptance:** all context item types render; welcome feels like the marketing hero.

### 5.8 WS8 — Backend: Auth, Tracking, Video Token `[ ]`
**Owns:** `functions/**`, `migrations/**`, `wrangler.toml`, `.dev.vars.example`, `src/lib/track.ts`
(transport only), `src/lib/video.ts` (resolver + token fetch), `src/lib/session.ts` (new).
**D1 schema (`migrations/0001_init.sql`)**
```sql
links(id TEXT PK, token TEXT UNIQUE, label TEXT, notes TEXT, created_at INT, expires_at INT,
      revoked_at INT, is_internal INT DEFAULT 0)
sessions(id TEXT PK, link_id TEXT, started_at INT, last_seen_at INT, ip_hash TEXT, country TEXT,
         region TEXT, city TEXT, ua TEXT, device_class TEXT, viewport TEXT, fingerprint TEXT)
events(id INTEGER PK AUTOINCREMENT, session_id TEXT, link_id TEXT, ts INT, type TEXT,
       layer_id TEXT, node_id TEXT, props TEXT)
-- indexes on sessions(link_id), events(link_id, ts), events(session_id)
```
**Cookie:** `sc_s` = base64url(`linkId.sessionId.iat`) + `.` + HMAC-SHA256(`SESSION_SECRET`).
HttpOnly, Secure, SameSite=Lax, 30 days. Middleware verifies signature and, at most once per 60s
per session (cheap cache header trick or KV-less: just query D1), that the link is not revoked/expired.
**Routes:** `GET /i/:token` (unknown/revoked/expired → 302 `/gate?r=invalid|revoked|expired`);
`_middleware` (allowlist: `/i/*`, `/gate`, `/admin*`, `/api/admin/*`, `/assets/fonts/*`,
`/favicon.svg`); `POST /api/track` (array of events ≤50, validates types, inserts, updates
`last_seen_at`); `GET /api/session` (`{label, linkId}`); `GET /api/video/token?uid=` (signs a Stream
token with `STREAM_SIGNING_KEY_ID`/`STREAM_SIGNING_KEY_JWK`, 1h expiry; returns 501 if unset).
**Admin API:** `POST /api/admin/login` (compares `ADMIN_PASSWORD`, sets `sc_admin` signed cookie),
`GET/POST /api/admin/links`, `PATCH /api/admin/links/:id` (revoke, reactivate, expiry, label),
`GET /api/admin/links/:id` (sessions + event summary + forwarding flags: distinct ip_hash,
fingerprint, country counts), `GET /api/admin/links/:id/events?cursor=`.
**Client:** `track.ts` batches, flushes every 5s / 20 events / on `visibilitychange` via
`sendBeacon`; heartbeat every 30s; device class + viewport + fingerprint-lite (UA, screen, tz, lang
hashed) sent once per session as `session_start`. `session.ts` fetches `/api/session` once.
**Local dev:** `npm run dev:api` with `--local` D1 and `.dev.vars`. Seed script creates one
internal link and prints the URL.
**Acceptance:** no cookie → `/gate`; valid `/i/<token>` → app; revoke → next request → `/gate`;
events land in D1; `wrangler d1 migrations apply` documented.

### 5.9 WS9 — Admin UI `[ ]`
**Owns:** `src/admin/**`. Depends only on the API contract in §5.8 (mock it locally if WS8 not merged).
**Pages:** `/admin` login → `/admin/links` table (label, created, expires, status, sessions,
last seen, opens, distinct devices/locations with a ⚑ when >1) with "New link" (label, notes,
expiry, internal flag) producing a copyable URL; `/admin/links/:id` detail: link controls
(revoke/reactivate/extend), sessions list (device, location, first/last seen), event timeline
(grouped by session, human-readable: "Focused Biosecurity · 42s", "Played Red Teaming video · 80%"),
"Most viewed nodes" list. Same dark tokens, dense tables, no charts.
**Acceptance:** full flow works against real API; admin routes render without the investor gate.

### 5.10 WS10 — Video Player `[ ]`
**Owns:** `src/components/VideoPlayer*`, `src/lib/video.ts` (resolver logic only; token fetch
shape agreed with WS8: `GET /api/video/token?uid=` → `{token}`).
**Behavior:** `resolveVideoSource(link)`: 32-hex → Stream UID; `*.cloudflarestream.com` URL →
Stream; `r2:` prefix → signed R2 URL later (stub); `http(s)://*.mp4|webm` → native; empty → none.
Inline state: 16:9 poster (placeholder scene in sector color, centered play glyph). Play → sets
`videoExpanded`, frame animates (motion `layoutId`) to fill the stage, dims stage header; Stream via
`<iframe>` with signed token, native via `<video>`. Esc/close returns. Events: `video_play`,
`video_pause`, `video_progress` at 25/50/75, `video_complete` (Stream via its SDK `postMessage`
events; native via `timeupdate`).
**Acceptance:** works with none/native/Stream (Stream verified with a test UID when Hunter provides
one); expansion smooth; keyboard `Space`/`Esc` handled without triggering global shortcuts.

---

## 6. Tracking Event Catalogue

| Event | Props |
|---|---|
| `session_start` | deviceClass, viewport, fingerprint, tz, lang, referrer |
| `heartbeat` | layerId, nodeId |
| `layer_view` | layerId, via (`arrow`,`nav`,`search`,`url`,`keyboard`,`related`) |
| `node_focus` | layerId, nodeId, via |
| `node_blur` | layerId, nodeId, dwellMs |
| `emphasis_change` | value |
| `density_change` | value |
| `search` | q, resultCount |
| `related_click` | fromNodeId, toNodeId |
| `context_item_open` | nodeId, itemType, url |
| `external_link` | nodeId, url |
| `video_play` / `video_pause` / `video_progress` / `video_complete` | nodeId, source, pct |
| `presentation_toggle` | on |

---

## 7. WS11 — Integration, QA, Deploy Docs `[ ]`

1. Merge all branches per §3 order; resolve appends in shared files; rerun typecheck/lint/tests/build.
2. Walk every route in Chrome at 1440×900 and 1920×1080; screenshot each layer view and one focus
   per layer into `build-plans/screens/final/`. Check emphasis + density + both panels collapsed +
   presentation mode + search + keyboard.
3. Mobile blocker check at 390×844.
4. Attractor perf: confirm pause on hidden tab, `prefers-reduced-motion`, and frame time on layers.
5. Run the full auth loop locally: seed link → open → browse → revoke in admin → confirm gate.
6. `README.md`: Cloudflare Pages setup (build `npm run build`, output `dist`, Node 22), D1 create +
   bind + migrate, secrets to set (`SESSION_SECRET`, `ADMIN_PASSWORD`, `STREAM_*`), custom domain
   `context.stablechaos.com`, creating links, uploading Stream videos and pasting UIDs into
   `content/*.json`, how to add context items (shape), how to run locally.
7. Write `build-plans/04-phase-3-handoff.md`: exactly which JSON fields Hunter fills next and what
   UI changes when real content lands (placeholder labels removed, empty-state hiding).

---

## 8. Orchestration Runbook (how the orchestrator runs this)

1. **WS0** runs in this main context or a single fresh agent on `main`. Commit.
2. Spawn Phase 1 agents concurrently with `isolation: "worktree"`, one per workstream, each with
   the prelude + its section verbatim. Each commits to its branch.
3. As agents finish, merge in §3 order into `main`, run checks, fix conflicts, commit.
4. Run **WS11** in a fresh agent on `main`.
5. Push to GitHub; Hunter connects Cloudflare Pages, creates D1, sets secrets, adds domain.

Progress is tracked in `build-plans/03-progress.md` (created by WS0), one heading per workstream.
