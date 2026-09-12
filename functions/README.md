# Pages Functions

Cloudflare Pages Functions for `context.stablechaos.com`. Owned by **WS8**. The API contract
(routes, JSON, cookies) is written up in `build-plans/03-progress.md` under **WS8**.

```
_middleware.ts               investor gate: verifies sc_s, re-checks revoke/expiry in D1
i/[token].ts                 GET  /i/:token          validate link → session row → sc_s cookie → 302 /
api/track.ts                 POST /api/track         batched events (JSON array ≤ 50, text/plain ok) → 204
api/session.ts               GET  /api/session       { label, linkId, sessionId }
api/video/token.ts           GET  /api/video/token?uid=  { token } (Stream RS256 JWT, 1h) · 501 until STREAM_* set
api/admin/_middleware.ts     everything under /api/admin/* except login needs the sc_admin cookie
api/admin/login.ts           POST { password } → sc_admin (12h) · GET → { ok }
api/admin/logout.ts          POST → clears sc_admin
api/admin/links/index.ts     GET list (with per-link aggregates) · POST create
api/admin/links/[id].ts      GET detail (sessions + summary) · PATCH revoke/reactivate/expiresAt/label/notes
api/admin/links/[id]/events.ts  GET paginated events, newest first (?cursor=&limit=&session=)
_lib/                        env types, WebCrypto helpers, cookies, D1 row mappers, HTTP helpers, UA + event validation
tsconfig.json                typed against @cloudflare/workers-types; part of `npm run typecheck`
```

## Gate rules

- Every request needs a valid `sc_s` cookie except: `/i/*`, `/gate`, `/admin*`, `/api/admin/*`,
  `/favicon.svg`, `/assets/fonts/*`, `/assets/logos/*` and the **public** Vite chunks
  (`/assets/<name>-<hash>.js|css|map`) — the entry with the router, the gate page and the admin
  login form, which carries no content.
- The investor shell, the layers, the content JSON, three.js and the signed-in admin pages are
  emitted under `/assets/private/` (see `vite.config.ts`). Those go through the gate like any page;
  a valid `sc_admin` cookie is accepted there too, so the admin UI can load its own chunk.
- Missing cookie → `302 /gate?r=none`; bad signature / stale → `?r=invalid` (cookies cleared);
  link revoked / expired → `?r=revoked` / `?r=expired`. API paths get `401 { error, reason }` instead.
- The revoke/expiry D1 read happens on every HTML navigation (one per page load) and at most once
  per 60s per session for everything else, remembered in the signed `sc_v` cookie.
- Gated HTML is served with `Cache-Control: private, no-cache`.

## Running locally

Everything below expects `.dev.vars` (copy `.dev.vars.example`). Never commit it.

**wrangler + workerd (macOS 13.5+ or Linux/glibc 2.35+)**

```bash
npm run build                       # Pages Functions serve the built dist/
npm run db:migrate:local            # apply migrations/ to the local D1 (.wrangler/state)
npm run seed -- --label "Hunter"    # inserts an internal link, prints http://127.0.0.1:8788/i/<token>
npm run dev:api                     # wrangler pages dev dist --port 8788
```

For hot-reloading UI work run `npm run dev` (Vite on :5173) alongside `dev:api`; Vite proxies
`/api` and `/i` to :8788 without rewriting `Host`, so `request.url` (and therefore every redirect,
the created-link `url` and the cookie origin) is the Vite origin. Open the `/i/<token>` path
through :5173. Cookies are set without `Secure` over plain http so local browsers keep them.

Differences from production: the client IP comes from the socket (`cf-connecting-ip` is set by
wrangler) and there is no edge cache. `request.cf` geo *is* populated under wrangler — it resolves
the machine's public IP — so sessions get a real country/region/city locally. The
`/api/video/token` JWT signing is real once `STREAM_*` are set.

## Secrets

| Name | Purpose |
|---|---|
| `SESSION_SECRET` | HMAC key for `sc_s`, `sc_v`, `sc_admin` (32+ random chars in production) |
| `ADMIN_PASSWORD` | `/admin` login |
| `IP_HASH_SECRET` | optional; HMAC key for visitor IP hashes (defaults to `SESSION_SECRET`) |
| `STREAM_SIGNING_KEY_ID` / `STREAM_SIGNING_KEY_JWK` | Cloudflare Stream signing key (`POST /accounts/:id/stream/keys`); paste `result.id` and `result.jwk` (base64 as returned, or the raw JSON) |

Production: `npx wrangler pages secret put SESSION_SECRET` (repeat per name) or the Pages
dashboard → Settings → Environment variables (encrypt). Local: `.dev.vars`.

## Tests

`npm run test` runs `functions/_lib/*.test.ts` (cookie sign/verify and domain separation, UA
device class, event validation) alongside the app tests.
