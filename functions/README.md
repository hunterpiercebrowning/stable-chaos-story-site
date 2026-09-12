# Pages Functions

Owned by **WS8**. Nothing here yet — the app runs fully static until it lands.

Planned files (see `build-plans/02-build-plan.md` §1 and §5.8):

```
_middleware.ts        session gate (allowlist: /i/*, /gate, /admin*, /api/admin/*, fonts, favicon)
i/[token].ts          validate token -> set sc_s cookie -> record session -> 302 /
api/track.ts          POST batched events from src/lib/track.ts
api/session.ts        GET { label, linkId } for the welcome personalization
api/video/token.ts    GET signed Cloudflare Stream playback token
api/admin/*.ts        login, links CRUD, sessions, events
```

Local: `npm run dev:api` (wrangler pages dev on :8788); the Vite dev server proxies `/api` and `/i` there.
