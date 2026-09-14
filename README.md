# Stable Chaos — Investor Story Site

A private, link-gated pitch experience for **context.stablechaos.com**. Nine layers of story
(Welcome → Who We Are → Our Operational Advantage → What We Believe → Critical Sectors →
What We've Done → Services → Products → Foundational Background), navigated like a layered node
graph: a left index, a centre stage with focusable nodes, and a right "Supporting Context" tray. Every visit is tracked per invitation link and
reviewed in a built-in admin.

Stack: Vite + React + TypeScript · `motion` (layout transitions) · Zustand (UI state) ·
React Router (URLs) · plain CSS with tokens · Three.js (the attractor backdrop) ·
Cloudflare Pages + Pages Functions + D1 (+ Cloudflare Stream for private video).

This file is the deploy and operations guide. The build history, per-workstream notes and the
content handoff live in `build-plans/` (`03-progress.md`, `04-phase-3-handoff.md`).

---

## 1. Quick reference

| I want to… | Do this |
|---|---|
| Run the UI locally | `npm install && npm run dev` (Vite on :5173; needs the API below for the gate/tracking) |
| Run the API + gate locally | `npm run build && npm run seed -- --label "Hunter" && npm run dev:api` (wrangler + local D1), then open the printed `/i/<token>` path on :5173 |
| Sign in to the admin locally | open `/admin`, password = `ADMIN_PASSWORD` from `.dev.vars` (`dev-admin` in the example) |
| Create an investor link in production | `/admin` → **New link** → copy the URL, or `npm run seed -- --remote --label "…"` |
| Turn a link off / on / extend it | `/admin/links/<id>` → Revoke · Reactivate · Set/Extend expiry |
| Change copy, images, videos, sources | edit `content/*.json` (see §6 and `content/SCHEMA.md`), commit, push |
| Ship | push to `main`; Cloudflare Pages builds and deploys (§3) |
| Check everything before/after a deploy | `npm run typecheck && npm run lint && npm run test && npm run build`, then §4 |

---

## 2. Local development

Node 22, npm 11. Copy `.dev.vars.example` → `.dev.vars` (server secrets) and, if you have a Stream
customer code, `.env.example` → `.env.local` (client vars). Neither file is committed.

### 2a. Vite only (UI work, no gate)

```bash
npm run dev            # http://localhost:5173
```

The investor gate lives in the Pages Functions, so on the bare Vite server every route is open
and `/api/*` calls fail quietly (tracking queues, "Prepared for" stays hidden). Vite proxies
`/api` and `/i` to `:8788` **without rewriting `Host`**, so the Functions see the Vite origin: run
the API server below alongside it and open the `/i/<token>` path **through :5173** — the redirect
and the cookie then land on `localhost:5173` and the app hot-reloads with the gate active.

### 2b. API + gate (wrangler + local D1)

`wrangler pages dev` runs the real Workers runtime (`workerd`; macOS 13.5+ or Linux) with a local
D1 under `.wrangler/state/`, serving the built `dist/` plus `functions/`:

```bash
npm run build                      # Functions serve dist/, so build first
npm run db:migrate:local           # wrangler d1 migrations apply stable-chaos-context --local
npm run seed -- --label "Hunter"   # inserts an internal link, prints http://127.0.0.1:8788/i/<token>
npm run dev:api                    # wrangler pages dev dist --port 8788
```

Open the printed `/i/<token>` path on `http://localhost:5173` (with `npm run dev` running) for
hot reload, or on `:8788` directly to test the built bundle. `seed` re-applies migrations first
(safe to repeat) and accepts `--origin http://localhost:5173` to print the Vite URL. Differences
from production: cookies are set without `Secure` over plain http, and the client IP comes from
the socket; `request.cf` geo **is** populated under wrangler (it resolves your public IP), so the
admin session list shows a real city/country locally. Rebuild after UI changes when testing on
`:8788`; the Functions serve whatever is in `dist/`. Inspect the local database with
`npx wrangler d1 execute stable-chaos-context --local --command "SELECT …"`.

### 2c. Admin UI without a backend

`VITE_ADMIN_MOCK=1 npm run dev`, open `/admin`, password `admin`. Seeded fixtures (3 links, 8
sessions, ~300 events) that speak the backend's wire shapes. The mock never reaches a production
bundle.

### Scripts

```
npm run dev               Vite dev server (:5173, proxies /api and /i to :8788)
npm run dev:api           wrangler pages dev dist --port 8788   (real Workers runtime + local D1)
npm run build             tsc -b && vite build → dist/
npm run preview           serve dist/ without the Functions (everything open, no tracking)
npm run typecheck | lint | test
npm run db:migrate:local  apply migrations/ to the local D1
npm run db:migrate:remote apply migrations/ to the production D1
npm run seed -- [--remote] [--no-migrate] [--label "…"] [--notes "…"] [--origin https://…]
```

---

## 3. Deploying to Cloudflare Pages

Everything below is a one-time setup except "push to main".

### 3a. Pages project

1. Cloudflare dashboard → Workers & Pages → Create → Pages → **Connect to Git** → this repo,
   production branch `main`.
2. Build settings: framework preset *None* · build command `npm run build` · build output
   directory `dist` · root directory `/`.
3. Environment variables (Production **and** Preview):
   - `NODE_VERSION` = `22`
   - `VITE_STREAM_CUSTOMER_CODE` = your Stream customer code (§7) — build-time, public, optional
     until videos exist.
4. Compatibility: `wrangler.toml` sets `compatibility_date = "2026-09-01"`. No compatibility flags
   are needed — the Functions use only WebCrypto, `fetch` and D1. (`nodejs_compat` is only
   required if a future dependency imports Node built-ins.)
5. Save and deploy once so the project exists; it will fail to gate until D1 and secrets are set.

### 3b. D1 database

```bash
npx wrangler login
npx wrangler d1 create stable-chaos-context
```

Paste the returned `database_id` into `wrangler.toml` (`[[d1_databases]]`, binding `DB`; use the
same id for `preview_database_id` unless you want a separate preview DB), commit, push. Then apply
the schema to production:

```bash
npm run db:migrate:remote           # wrangler d1 migrations apply stable-chaos-context --remote
npx wrangler d1 migrations list stable-chaos-context --remote
```

For Git-connected projects also bind it in the dashboard: Pages project → Settings → Functions →
**D1 database bindings** → variable `DB` → `stable-chaos-context` (Production and Preview).

### 3c. Secrets

Pages project → Settings → Environment variables → add as **Secret** (or
`npx wrangler pages secret put <NAME> --project-name stable-chaos-story-site`):

| Name | Value |
|---|---|
| `SESSION_SECRET` | 32+ random characters (`openssl rand -base64 48`). Signs the `sc_s` / `sc_v` / `sc_admin` cookies. Rotating it signs everyone out. |
| `ADMIN_PASSWORD` | the `/admin` password |
| `IP_HASH_SECRET` | optional separate key for hashed visitor IPs (defaults to `SESSION_SECRET`) |
| `STREAM_SIGNING_KEY_ID` | Stream signing key id (§7) — leave unset until videos exist |
| `STREAM_SIGNING_KEY_JWK` | Stream signing key JWK, raw JSON or the base64 the API returns (§7) |
| `STREAM_ACCOUNT_ID` | your Cloudflare account id — only used by you when calling the Stream API (§7); the site itself does not read it |

Client-side, build-time (plain variable, not secret): `VITE_STREAM_CUSTOMER_CODE` (§3a).

Redeploy after adding secrets (Deployments → Retry, or push).

### 3d. Custom domain

Pages project → Custom domains → **Set up a custom domain** → `context.stablechaos.com`. If
`stablechaos.com` is on Cloudflare DNS the CNAME is created for you; otherwise add
`context CNAME stable-chaos-story-site.pages.dev`. HTTPS is automatic; the cookies are `Secure`
on https.

Invitation URLs use the origin of the request that created them, so links created in `/admin`
on `context.stablechaos.com` are already `https://context.stablechaos.com/i/<token>`.

---

## 4. Verify on first deploy

The gate and D1 paths were verified locally on the real Workers runtime
(`build-plans/screens/final/auth-loop-wrangler.txt`). Walk this once on the real deployment:

1. `https://context.stablechaos.com/` → redirects to `/gate?r=none` ("Invitation required").
2. `/admin` → sign in → **New link** → copy the URL. `GET /api/admin/login` should answer
   `{"ok":true}` while signed in.
3. Open the URL in a private window → lands on the welcome state with "Prepared for <label>".
   Walk the down arrows through all nine layers; focus a node in each; open the tray; press `/`
   and search.
4. Back in `/admin/links/<id>`: the session row shows device, viewport and **a real city/country**
   (`request.cf` geo from a real edge location). The timeline
   shows `Session started`, `layer_view` / `node_focus` lines with `via`, and heartbeats every 30s.
5. **Revoke** the link. In the investor window, click any layer or reload → `/gate?r=revoked`.
   Reactivate → open the `/i/<token>` URL again → back in. Set an expiry in the past →
   `/gate?r=expired`.
6. Private chunks: while signed out of everything, open
   `view-source:https://context.stablechaos.com/` and request one of the
   `/assets/private/*.js` URLs — it must redirect to `/gate`; the top-level `/assets/index-*.js`
   must load. (`curl -I https://context.stablechaos.com/assets/private/<name>.js` → 302.)
7. A phone (or a window narrower than 1024px) shows "Please view on a laptop or desktop", and the
   open is still counted.
8. Once a Stream video is wired (§7): play it inside a focus view — the player must **not** show
   the "Signing unavailable — playing unsigned" pill; `GET /api/video/token?uid=<uid>` returns
   `{"token":"…"}`.
9. Preview deployments (pull requests) use the same D1 unless you gave them their own id; links
   created there are real links.

---

## 5. Operating the site

### Access model

- The only credential is the invitation link `/i/<token>`. Visiting it sets `sc_s`
  (HttpOnly, Secure, SameSite=Lax, 30 days) and records a session; the cookie is checked on every
  request, and the link's revoked/expired state is re-read from D1 on every HTML navigation (at
  most once per 60s for assets and API calls). No cookie → `/gate?r=none`; bad cookie → `?r=invalid`;
  revoked / expired → `?r=revoked` / `?r=expired`.
- The public bundle (`/assets/<name>-<hash>.js|css`) contains only the router, the gate page and
  the admin login form. Everything with content — the investor shell, the layers, the content
  JSON, three.js and the signed-in admin pages — is emitted under `/assets/private/` and is
  served only with an investor session or an admin cookie. Headshots and icons under
  `/assets/headshots|icons` are gated too; fonts and logos are public.
- `/admin` is protected by `ADMIN_PASSWORD` (`sc_admin` cookie, 12h). Sign out clears it.

### Investor links (`/admin`)

- **New link** → label (shown as "Prepared for …" on the welcome state), notes (internal), expiry
  (none / preset / date), *Internal* flag (for rehearsals). The dialog shows the copyable URL.
- The list shows sessions, opens (page loads), last seen, devices / locations and a ⚑ when the
  server saw more than one device fingerprint or more than one country on a link — a hint that the
  link was forwarded. Click a row for the detail.
- Detail: Revoke (takes effect on the visitor's next page load), Reactivate, Set/Extend expiry,
  Edit label/notes; sessions (device, browser, location, first/last seen, event count); "Most
  viewed nodes" (focus count, total dwell); videos (plays, furthest point); and the timeline,
  grouped by session, newest first, heartbeats hidden behind a toggle.
- Links can also be created from a terminal: `npm run seed -- --remote --label "Acme"` (prints
  the production URL; needs `wrangler login`).

### Events

Every visitor action is one row in D1 (`events`), batched by the client every 5s / 20 events and
on tab hide. Types: `session_start` (device, viewport, fingerprint, tz, lang, referrer),
`heartbeat` (every 30s, with the current layer/node), `layer_view` and `node_focus` (each with
`via` = `arrow` · `nav` · `search` · `keyboard` · `related` · `click` · `url`), `node_blur`
(dwell ms), `density_change`, `search`, `related_click`, `context_item_open`,
`external_link`, `video_play` / `video_pause` / `video_progress` (25/50/75) / `video_complete`,
`presentation_toggle`. Nothing is tracked on `/gate` or `/admin`.

### Keyboard map (presenting)

| Key | Action |
|---|---|
| `↑` / `↓` | previous / next layer |
| `←` / `→` | previous / next sibling node (first node when none is focused) |
| `Enter` | focus the first node on the layer |
| `Esc` | close, in order: search → expanded video → gallery lightbox → focused node → presentation mode |
| `/` | search (↑↓ move, Enter open) |
| `[` / `]` | toggle the left index (full ↔ icon rail) / the right tray |
| `P` | presentation mode (panels away, minimal chrome; `P` or `Esc` exits) |
| `Space` (video open) | play / pause |

Density (Compressed / Expanded, top bar) is not in the URL; density and the panel
state persist in the browser.

---

## 6. Editing content

All copy, image paths, video ids and supporting sources live in `content/*.json` and are compiled
into the site at build time — edit, commit, push, and Pages redeploys. `content/SCHEMA.md`
documents every field per file; `build-plans/04-phase-3-handoff.md` lists exactly which fields are
still empty and what changes on screen when they are filled.

Rules of thumb:

- Never change a node's `id` after a link has been shared — it is the URL.
- Array order is display order.
- Any empty string / empty array renders a deterministic lorem or generated placeholder with a
  small "placeholder" label, so the layout can be designed before the words exist. Fill the field
  and the placeholder (and its label) disappears.
- Image paths are absolute web paths into `public/` (e.g. `/assets/logos/gcb-logo.svg`). Put new
  files under `public/assets/<kind>/`.

### Adding supporting context (right tray)

Each node has a `context_items` array. Items render as cards by `type`; a node with none shows
three lorem placeholders until the first real item lands.

```json
{
  "type": "article",
  "title": "Biosecurity in an Age of Synthetic Biology",
  "source": "CSIS",
  "url": "https://www.csis.org/analysis/…",
  "thumbnail": "/assets/context/csis-biosecurity.jpg",
  "blurb": "One or two sentences on why this matters to the claim.",
  "date": "2025"
}
```

`type` is one of `article` · `video` · `link` · `pdf` · `image` · `quote`. `url` opens in a new tab
(tracked as `context_item_open`); a `video` item's `url` follows the same rules as `video_link`
below and opens the full-screen player; `thumbnail` is optional (a generated placeholder is used
when empty); `quote` uses `title` for the quote and `source` for the attribution.

---

## 7. Video (Cloudflare Stream)

`video_link` on any node (and a `video` context item's `url`) accepts:

- a **Stream UID** (32 hex chars) — the intended path, signed playback;
- a Stream URL (`https://customer-<code>.cloudflarestream.com/<uid>/…`);
- a plain `https://…/file.mp4` or `.webm` URL (native `<video>`, no signing);
- `""` — the poster placeholder ("no source yet").

Set up Stream once:

1. Dashboard → Stream → enable. Note your **customer code** (any video → Embed → the
   `customer-<code>.cloudflarestream.com` subdomain) → set `VITE_STREAM_CUSTOMER_CODE` in the Pages
   build variables (§3a) and rebuild.
2. Create a signing key (once), then set the two secrets (§3c):
   ```bash
   curl -X POST "https://api.cloudflare.com/client/v4/accounts/<STREAM_ACCOUNT_ID>/stream/keys" \
        -H "Authorization: Bearer <API_TOKEN with Stream:Edit>"
   # result.id  → STREAM_SIGNING_KEY_ID
   # result.jwk → STREAM_SIGNING_KEY_JWK  (paste the base64 exactly as returned)
   ```
3. Upload each video (dashboard → Stream → Upload, or `npx wrangler stream upload`), open it and
   turn on **Require signed URLs** so it cannot play outside the site. Copy its UID.
4. Paste the UID into the node's `video_link` (or a context item's `url`), commit, push.

Playback: the player asks `GET /api/video/token?uid=` for a 1-hour RS256 token; until the secrets
are set that endpoint answers 501 and the player falls back to an unsigned embed with a visible
"Signing unavailable" pill (which only works for videos that do **not** require signed URLs).
Events `video_play` / `video_pause` / `video_progress` / `video_complete` come from the Stream SDK
(loaded on demand from `embed.cloudflarestream.com`) or the native element.

---

## 8. Repository layout

```
content/         the JSON Hunter edits — every word and image path on the site. See content/SCHEMA.md.
public/assets/   fonts, logos, headshots, icons (served as-is; headshots/icons are gated)
src/data/        the only module that reads content/. getLayers/getNodes/getNode/getRelated/search,
                 getCopy/getContextItems/getPoster (lorem + placeholder fallbacks)
src/store/       Zustand UI state (density, panels, presentation, search, video, nav intent)
                 + the global keyboard map
src/lib/         track (event batching + heartbeats), video (source resolution, Stream token), session, measure
src/shell/       AppShell, TopBar, LeftNav, RightTray, Stage, Attractor, SearchOverlay, MobileBlocker
src/components/  NodeCard, FocusFrame, RelatedStrip, ContextCard, ConnectorLayer, VideoPlayer, Placeholder, Icon, tags
src/layers/      registry.ts (layerId → { Layer, Node, Focus }) + one folder per layer
src/admin/       the /admin app (login form ships in the public entry; the pages are a private chunk)
src/pages/       the /gate page
functions/       Cloudflare Pages Functions: gate middleware, /i/:token, /api/track, /api/session,
                 /api/video/token, /api/admin/* (see functions/README.md for the API contract)
migrations/      D1 schema (see migrations/README.md)
scripts/         seed-link.mjs (create an invitation link in the local or remote D1)
build-plans/     build plan, per-workstream progress notes, screenshots, Phase 3 handoff
wrangler.toml    Pages project config: output dir, D1 binding, secret names
```

### Conventions (for code changes)

- The URL owns `layerId` and the focused node; Zustand owns everything else.
- Components import data only from `src/data` and fire events only through `track()`.
- Colors, spacing, radii and motion come from `src/styles/tokens.css`; no hardcoded hex elsewhere.
- Compressed density collapses secondary nodes on Sectors and Services.
- Desktop only: below 1024px the site shows the full-screen "please view on a laptop or desktop".
- `vite.config.ts` decides which chunks are private (content, `src/data`, `src/layers`,
  `src/shell`, `src/admin` pages, three.js). Keep new content-bearing modules under those paths.
