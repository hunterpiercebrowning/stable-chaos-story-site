# Resume Prompt — Stable Chaos Pitch Site (post macOS update)

Paste everything below the line into a fresh Claude Code session opened in
`/Users/hunterbrowning/ws/stable-chaos-story-site`.

---

I'm resuming work on the Stable Chaos investor pitch site. The full v1 build is complete and
committed on `main` (33 commits, all local checks green). The one thing that could never be
verified on this machine was the real Cloudflare stack: `wrangler pages dev` needs macOS 13.5+
and I was on 13.2. I have now updated macOS. Your job is to get the site running locally on the
real Workers runtime, fix whatever that surfaces, then help me deploy.

## Orient yourself first (read, don't skim)
1. `README.md` — the deploy and operations guide. Sections 2 (local dev), 3 (Cloudflare Pages
   setup), 4 (verify on first deploy), 7 (Stream video).
2. `build-plans/02-build-plan.md` §0 (locked decisions) and §2 (conventions — follow them).
3. `build-plans/03-progress.md` — the WS8 and WS11 sections, especially WS8's deviations
   (workerd could not run; Node shim used instead) and WS11's "Not verifiable locally" and
   "Remaining known issues" lists.
4. `build-plans/04-phase-3-handoff.md` — what content I fill in next and what UI changes when it lands.
5. `wrangler.toml`, `.dev.vars.example`, `.env.example`, `package.json` scripts,
   `functions/README.md`, `migrations/README.md`.

## Phase A — real local runtime
1. Confirm `npx wrangler --version` runs and `npx wrangler pages dev` starts on this OS.
2. Follow README §2's wrangler path: `.dev.vars` from the example, `npm run build`,
   `npm run db:migrate:local`, `npm run seed -- --label "Hunter"`, `npm run dev:api`, and
   `npm run dev` with the Vite proxy. Open the printed `/i/<token>` URL through `:5173`.
3. Re-run the full auth loop that WS11 ran on the Node shim, but now against workerd + local D1:
   no cookie → `/gate?r=none`; token → app with "Prepared for" label; browse and confirm events
   land in D1 (`wrangler d1 execute --local`); admin login → create link → detail → revoke →
   `/gate?r=revoked`; reactivate; expired link → `?r=expired`; tampered cookie → `?r=invalid`;
   `/assets/private/*` chunks are 302'd without a cookie; logout. Save the transcript to
   `build-plans/screens/final/auth-loop-wrangler.txt`.
4. Anything that behaved differently under workerd than under the Node shim
   (`scripts/dev-api-node.mjs`) is a real bug in `functions/**`: fix it in the Functions, not the
   shim. Typical suspects: `request.cf` access, D1 batch/prepared-statement semantics, `Response`
   header handling in `_middleware.ts`, `crypto.subtle` key import, cookie attributes on
   `http://localhost`.
5. Decide whether to keep `scripts/dev-api-node.mjs` and `dev:api:node`. If wrangler now works,
   I'd rather delete the shim than maintain two API paths. Update README §2 accordingly.

## Phase B — deploy to Cloudflare
Walk me through README §3 step by step and do everything you can from the CLI (`wrangler`,
`gh`); tell me exactly what to click for the parts that need the dashboard. Order:
1. Push `main` to GitHub if I haven't (`git push -u origin main`).
2. Create the Pages project from the repo (build `npm run build`, output `dist`, Node 22).
3. `wrangler d1 create`, paste the ids into `wrangler.toml` (production and a separate preview
   database so previews don't share prod data), commit, `npm run db:migrate:remote`.
4. Set secrets: `SESSION_SECRET` (generate 32 random bytes), `ADMIN_PASSWORD`, and the
   `STREAM_*` secrets once I have a Stream signing key. `VITE_STREAM_CUSTOMER_CODE` is a
   build-time variable on the Pages project.
5. Custom domain `context.stablechaos.com`.
6. Run README §4 "Verify on first deploy" against the live site and report each item pass/fail.
   Confirm geo (`country/city`) populates in the admin session list from a real visit.

## Phase C — Stream
Once I've uploaded one test video to Cloudflare Stream and given you its UID: create the signing
key per README §7, set the secrets, paste the UID into one node's `video_link` in
`content/*.json`, redeploy, and confirm signed playback works in the expanded player and that
`video_play/progress/complete` events reach D1.

## Phase D — content pass (when I say I'm ready)
Follow `build-plans/04-phase-3-handoff.md`. I will fill copy and context items in
`content/*.json`. You then do the go-live pass it describes: remove placeholder labels, make the
listed UI elements visibility-dependent on real content, and re-check the fit items in its §6.

## Known issues to keep in mind (from WS11)
- Long focus views (6 bullets or a big related strip) scroll at 1440×900 with both panels open;
  real copy is shorter and 1920 fits. Leave unless real content still overflows.
- `opens` counts every page load, so a presenter reloading inflates it.
- The admin cookie is stateless (12 h); rotate `SESSION_SECRET` to invalidate all sessions.
- `via: 'click'` is emitted but not in the §6 catalogue (backend doesn't validate `via`).

## Rules
- Follow `build-plans/02-build-plan.md` §2 conventions. No new dependencies without saying why.
- `npm run typecheck && npm run lint && npm run test && npm run build` clean before every commit.
- Commit in small logical commits with a `[Deploy]` prefix. Ask before anything destructive
  in Cloudflare (deleting databases, rotating secrets on a live site).
- Append a dated note to `build-plans/03-progress.md` under a new `## Post-build — Deploy`
  heading with what you verified, what you fixed, and what's still open.
