# Resume Prompt — Stable Chaos Pitch Site (post-launch)

The site is **live**. `05-resume-prompt.md` was the pre-deploy version and is now history; this one
replaces it. Paste everything below the line into a fresh Claude Code session opened in
`/Users/hunterbrowning/ws/stable-chaos-story-site`.

---

The Stable Chaos investor site launched on 2026-09-17 at **https://context.stablechaos.com**. The
simplified build is what shipped. Before you touch anything, read this file, then
`build-plans/03-progress.md` from the `## Post-build — Deploy` heading to the end (two dated
sections: Phase A local runtime, Phase B the launch).

## The shape of the thing

- **`simple` is the live line.** Cloudflare Pages deploys it on every push to `origin/simple`.
  `main`, `full` and tag `full-v1` are all frozen at `88202c3` and archive the complex nine-layer
  version. Do not tune content on `main`. To lift something back out of the complex version:
  `git show full-v1:content/<file>.json`.
- **Content is one tree.** `content/*.json`, edited in place. `content/layers.json` is the source of
  truth for which layers exist — `useRoute`, `LeftNav` and the up/down arrows all read it, so
  deleting an entry removes a layer from routing and nav with no code change. It currently holds 8
  layers and `background` is hidden by `HIDDEN_LAYER_IDS`, so **7 are visible**.
- **Simplifying is a content operation**, not a component rewrite. Start in `layers.json` and the
  node JSON; only touch components when the layout itself has to change.
- **Feature flags live in `src/lib/flags.ts`** and are all **build-time**, so flipping one is a
  redeploy, not a toggle: `RIGHT_TRAY_ENABLED` (false), `HIDDEN_LAYER_IDS` (`['background']`),
  `HOLDINGS_EXAMPLES_CLICKABLE` (false).

## Cloudflare, as built

| | |
|---|---|
| Pages project | `stable-chaos-story-site`, Git-connected, production branch `simple` |
| Account | `10cf36af6dfbc2bb8d5417fb1415f538` (`hunter.pierce.browning@gmail.com`) |
| D1 production | `stable-chaos-context` `65078d3c-d9df-4abc-90a5-5011b4f72304` |
| D1 preview | `stable-chaos-context-preview` `b34e8ca3-ed71-4994-94f9-a65dacb1b0fb` |
| Secrets set | `SESSION_SECRET`, `ADMIN_PASSWORD` |
| Secrets unset | `IP_HASH_SECRET` (falls back to `SESSION_SECRET`), `STREAM_*` (so `/api/video/token` is 501) |
| Node | pinned in-repo by `.node-version` = `22` |

**`wrangler.toml` is the source of truth**, so the dashboard's bindings and runtime variables are
read-only and show "Bindings for this project are being managed through wrangler.toml." That is
correct, not a problem — there is nothing to add there. Secrets are the exception: they live in
their own per-environment store and `wrangler pages secret put --project-name stable-chaos-story-site`
is the way to set them. (`wrangler pages secret put`, not `wrangler secret put` — the latter targets
Workers and would create a stray Worker.)

## Gotchas that cost real time, do not rediscover them

1. **Verifying the live site needs `?cb=$RANDOM`.** A plain request can be answered from a previous
   deployment's cached copy.
2. **Never test for a 404.** Pages serves the SPA fallback `index.html` with a **200** for any
   unmatched path, so a missing asset looks like a 200 of `text/html`. Check `content_type` and
   body, not status.
3. **Purge Everything does not clear Pages' own asset retention** (~1 week). If `cf-cache-status` is
   `DYNAMIC` and `age` keeps climbing through a purge, that is Pages' retention, not the zone cache.
   The request still reaches the Function, so the gate in `functions/_middleware.ts` is the lever
   that actually works. This is how the leaked source map got sealed in 60s.
4. **Pages binds secrets at deployment creation.** Setting a secret does nothing to a deployment
   that already exists; retry the deployment or push. A deployment that cannot see `SESSION_SECRET`
   500s on every route, including the middleware.
5. **Some commands are blocked by the auto-mode classifier** as production actions — most of
   `npm run db:migrate:remote` and `wrangler pages secret put`. Ask Hunter to run them with a
   leading `!` in the prompt. Read-only `wrangler d1 execute --remote --command "select …"` works
   fine and is the fastest way to check real state.
6. **Local dev's D1 is keyed by `preview_database_id`.** It now holds a real id, so the old local
   state is orphaned: `npm run db:migrate:local` then `npm run seed -- --label "Hunter"` before
   `npm run dev:api` + `npm run dev`. Keep `changeOrigin: false` in the Vite proxy or the gate
   breaks through `:5173`.

## House rules

- `npm run typecheck && npm run lint && npm run test && npm run build` clean before every commit.
  Commit in small logical commits; `[Deploy]` prefix for deploy/infra work.
- **No em dashes in site copy.** Use colons, commas, periods. (Code comments are not site copy.)
- **No bare `prettier`** — there is no config, and it flips quotes and reflows shared files.
- No new dependencies without saying why. Follow `build-plans/02-build-plan.md` §2 conventions.
- Ask before anything destructive in Cloudflare: deleting databases, rotating secrets on a live
  site, revoking a real investor link.
- Append a dated note to `build-plans/03-progress.md` under `## Post-build — Deploy` for any
  session that changes the deployment.

## What is open

**Phase C — Stream.** Nothing is wired: every `video_link` in `content/*.json` is empty, so no play
affordances render anywhere. When Hunter has a Stream video UID: create the signing key per README
§7, set `STREAM_SIGNING_KEY_ID` and `STREAM_SIGNING_KEY_JWK`, set the build-time
`VITE_STREAM_CUSTOMER_CODE`, paste the UID into one node's `video_link`, redeploy, and confirm
signed playback shows no "Signing unavailable" pill and that `video_play/progress/complete` reach D1.

**Phase D — content.** Follow `build-plans/04-phase-3-handoff.md`. This is what unblocks the
holdings flag below.

**`HOLDINGS_EXAMPLES_CLICKABLE`.** The Our Holdings Examples cards (service offerings and products)
look exactly as designed but open nothing, because their focus views shipped ahead of their copy.
One lever in `src/lib/flags.ts` covers all of it: the grid cards take a no-op instead of `onSelect`,
`data-locked` on the bands container drops the pointer cursor, and `Stage.tsx` folds holdings
secondaries out of the focus rail. Set it to `true` and redeploy once the copy lands. The focus
views themselves were never touched and still render for anyone with a direct link. Search (`/`) and
arrow-key sibling nav can still reach them; that was left alone deliberately, but it is a 20-minute
job behind the same flag if it ever matters.

**README §4 items never walked.** §4.5 revoke → reactivate → expire (both live links are real and in
use, so it wants a throwaway link) and §4.7 the mobile blocker under 1024px.

**Weight.** `public/assets/backgrounds` is 19 MB of the 24 MB build. Worth a pass if the holdings
page drags on conference wifi. The headshots are already done.

## Known warts

- `.DS_Store` is tracked despite being in `.gitignore` (committed before the rule), so it shows as
  modified whenever Finder touches the directory. Harmless; `git rm --cached .DS_Store` fixes it if
  it ever gets annoying.
- `opens` counts every page load, so a presenter reloading inflates it.
- The admin cookie is stateless (12 h); rotating `SESSION_SECRET` invalidates every session,
  investor and admin alike.
- Two wranglers: global `4.134.0` and the in-project devDependency `4.131.1` that the npm scripts
  use. Auth is per-user, so one `wrangler login` covers both.
- The Claude in Chrome extension has been disconnected since 2026-09-12. For screenshots, drive
  headless Chrome over CDP (`--remote-debugging-port`); `--virtual-time-budget` does not wait for
  real network, and the mobile blocker fires below ~1000px so use ≥1100px.
