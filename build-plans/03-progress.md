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

## WS9 — Admin UI `[ ]`

## WS10 — Video Player `[x]`

**Built**

- `src/lib/video.ts`: `resolveVideoSource(link)` → discriminated union `{kind:'none'} | {kind:'stream', uid}
  | {kind:'r2', key} | {kind:'url', url, mime}`. 32-hex → Stream (lower-cased); any
  `*.cloudflarestream.com` / `*.videodelivery.net` URL with a UID in the path → Stream; `r2:<key>` →
  r2; `http(s)://…` → url with a mime from the path extension (`.mp4/.webm/.m3u8/.mov/.ogv`; unknown
  extension → `mime: ''`, handed to `<video>` anyway); everything else → none. Also
  `streamEmbedUrl()`, `getStreamCustomerCode()`, `requestStreamToken()` (501 → `unconfigured`, any
  other failure → `unavailable`), `resolveStreamPlayback()` (signed token or unsigned-UID fallback),
  `loadStreamSdk()` (injects `https://embed.cloudflarestream.com/embed/sdk.latest.js` once), and the
  pure `progressPct()` / `crossedMilestones()` helpers. `fetchStreamToken()` kept for back-compat.
  15 vitest cases in `src/lib/video.test.ts`.
- `src/components/VideoPlayer.tsx` + `video-player.css`, replacing the WS0 placeholder. Inline: 16:9
  poster (`getPoster` scene in sector color, or the `poster` prop), play glyph, label, and a
  "placeholder" / "not yet available" note for none / r2. Play → the frame grows over the stage
  content area via a motion `layoutId` shared between the inline button and an overlay that is
  **portaled into `.stage-content`** (fallback `.stage`, else in place) so the focus frame's
  `overflow: hidden` / `backdrop-filter` cannot clip it. The media box inside is always a centred 16:9
  (`container-type: size` + `cqh`) and shares a second `layoutId`, so the poster scales uniformly
  instead of stretching. The real player mounts once the layout animation completes (700 ms safety
  fallback); reduced motion → no layoutId, instant swap. Close button, Esc, animate back.
- Stream: `<iframe src="https://customer-<code>.cloudflarestream.com/<tokenOrUid>/iframe?autoplay=true">`
  with `code` from `VITE_STREAM_CUSTOMER_CODE`; no code → `https://iframe.videodelivery.net/<uid>`.
  The token comes from `GET /api/video/token?uid=`; 501 / network error → unsigned UID with a visible
  pill "Signing unavailable — playing unsigned" (plus "Stream is not configured" on 501). Play /
  pause / timeupdate / ended arrive through the on-demand Stream SDK (`window.Stream(iframe)`). Native:
  `<video controls playsinline autoplay>` with `<source type=mime>`; decode failure shows "This video
  could not be played".
- Events via `track()`: `video_play` (each play, with pct), `video_pause` (not on end), `video_progress`
  at 25/50/75 once each per playback session (several at once after a seek), `video_complete` once;
  props `{ nodeId, source, pct }`. Closing mid-play emits a final `video_pause`. For none / r2 a single
  `video_play` (pct 0) records the intent.
- Keyboard while expanded: capture-phase `keydown`/`keyup` on `window` with `stopImmediatePropagation`
  — Space toggles play/pause, Esc closes — so neither the Stage's Esc handler nor WS6's global map
  fires (verified: Esc closes the video and the route stays on the node). Typing targets are ignored.
  Collapsed, the player claims no keys. Focus moves into the frame on open and back to the inline
  button on close.
- The stage header and footer arrow dim to 0.3 while a video is up via
  `.stage:has(.video-expanded) …` in `video-player.css` (Stage.tsx untouched).
- `.env.example` (new) documents `VITE_STREAM_CUSTOMER_CODE`; copy to `.env.local` (git-ignored).

**Final props** (all previous props unchanged; new ones optional)

```ts
interface VideoPlayerProps {
  node: Node;
  link?: string;                 // overrides node.videoLink (welcome intro)
  label?: string;                // inline label, default 'Watch'
  nodeId?: string;               // tracking id, default node.id
  poster?: string;               // default getPoster(node)
  autoplay?: boolean;            // default true, once the frame has settled
  className?: string;
  onExpandedChange?: (expanded: boolean) => void;
}
```

Env: client `VITE_STREAM_CUSTOMER_CODE` (`.env.example`); server `STREAM_SIGNING_KEY_ID` /
`STREAM_SIGNING_KEY_JWK` are WS8's (`.dev.vars.example`).

**Decisions / deviations**

1. Store contract unchanged: `videoExpanded` is mirrored from local state (set *before* `open` so the
   opening render never sees a stale `false`); an external `setVideoExpanded(false)` (Stage close)
   collapses the player, and unmount / node change clears the flag.
2. Non-media `http(s)` links resolve to `url` with an empty mime rather than `none`, so a broken link is
   visible ("could not be played") instead of silently showing a placeholder.
3. R2 is a stub: inline poster + "not yet available" note; expanding shows the same message.
4. No appends were needed to `tokens.css` or `Icon.tsx` (existing `play` / `close` icons and tokens
   suffice).

**Verified** (headless Chrome over CDP at 1440×900, temporary uncommitted `video_link` edits, reverted)

Native mp4 (MDN sample): expands, autoplays, Space pauses/resumes, Esc closes without leaving the
node route; events `video_play → video_progress ×2 → video_pause → video_play → video_pause`. Stream
(Cloudflare's public docs sample UID `b236bde30eb07b9d01318940e5fc3eda`, customer code
`m033z5x00ks6nunl` in `.env.local`): iframe URL built with the customer subdomain, SDK loaded on
demand, plays, "Signing unavailable" pill shown because `/api/video/token` is not served here;
`video_play` and `video_pause` (on close) arrive through the SDK. Welcome placeholder expands with
"no source yet". Reduced motion: frame and player present 60 ms after click, gone 60 ms after Esc.
Header dims to 0.3 while expanded. `typecheck`, `lint`, `test` (44) and `build` clean.

Screenshots: `build-plans/screens/ws10-video-inline.png`, `ws10-video-expanded.png`,
`ws10-video-stream.png`, `ws10-video-placeholder.png`.

**Left for integration**

- WS8: `GET /api/video/token?uid=` → `{ token }`, 501 when unconfigured (the client already handles
  both). Signed playback needs `VITE_STREAM_CUSTOMER_CODE` set in the Pages build env.
- Stage.tsx needs no change. WS11 may replace the `:has()` header-dim rule with a
  `data-video-expanded` attribute on `.stage` if `:has()` support is a concern (Chrome 105+, Safari
  15.4+, Firefox 121+).
- `.env` (without `.local`) is not git-ignored; `.gitignore` is not WS10's — WS11 may want to add it.
- HLS (`.m3u8`) via `<video>` plays natively only in Safari; Stream is the intended path for HLS.
- The Stream player SDK is a third-party script loaded at play time; if a CSP is added later it needs
  `script-src https://embed.cloudflarestream.com` and `frame-src https://*.cloudflarestream.com
  https://iframe.videodelivery.net`.

## WS11 — Integration, QA, Deploy Docs `[ ]`
