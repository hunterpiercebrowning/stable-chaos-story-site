# Stable Chaos — Investor Story Site

A private, link-gated pitch experience for `context.stablechaos.com`. Seven layers of story
(Welcome → Who We Are → What We Believe → Critical Sectors → Services → Products → Foundational
Background), navigated like a layered node graph: a left index, a centre stage with focusable
nodes, and a right "Supporting Context" tray.

Stack: Vite + React + TypeScript · `motion` (layout transitions) · Zustand (UI state) ·
React Router (URLs) · plain CSS with tokens · Three.js (the Halvorsen attractor backdrop) ·
Cloudflare Pages + Pages Functions + D1.

## Dev commands

```bash
npm install
npm run dev         # Vite dev server on :5173 (proxies /api and /i to :8788)
npm run dev:api     # wrangler pages dev dist --port 8788 --d1 DB --local  (needs a build first)
npm run build       # typecheck + production build to dist/
npm run preview     # serve the production build
npm run typecheck   # tsc -b --noEmit
npm run lint        # oxlint
npm run test        # vitest (data layer unit tests)
```

Node 22, npm 11.

## Where things live

```
content/         the JSON Hunter edits — every word and image path on the site. See content/SCHEMA.md.
public/assets/   fonts, logos, headshots (copied from the marketing site and ./assets)
src/data/        the only module that reads content/. Public API: getLayers, getNodes, getNode,
                 getRelated, search, plus getCopy/getContextItems (lorem + placeholder fallbacks).
src/store/       Zustand UI state (emphasis, density, panels, presentation, search, video)
src/lib/         track (events), video (source resolution), measure (ResizeObserver), cn
src/shell/       AppShell, TopBar, LeftNav, RightTray, Stage, Attractor, overlays
src/components/  NodeCard, FocusFrame, RelatedStrip, ConnectorLayer, VideoPlayer, Placeholder,
                 Icon, SectorTag, StageTag
src/layers/      registry.ts (layerId → { Layer, Node, Focus }) + one folder per layer
functions/       Cloudflare Pages Functions (WS8)
migrations/      D1 schema (WS8)
build-plans/     the build plan and per-workstream progress notes
```

## Editing content

All copy lives in `content/*.json`. Empty strings and empty arrays render deterministic lorem and
generated brand-colored SVG placeholders, so the layout can be designed before the words exist.
`content/SCHEMA.md` documents every field, the sector alias table and the context-item shape.

## Conventions

- The URL owns `layerId` and the focused node; Zustand owns everything else.
- Components import data only from `src/data` and fire events only through `track()`.
- Colors, spacing, radii and motion come from `src/styles/tokens.css`. No hardcoded hex elsewhere.
- Emphasis dims non-matching nodes (never hides). Compressed density collapses secondary nodes on
  Sectors and Services.
- Desktop only: below 1024px the site shows a full-screen "please view on a laptop or desktop".

## Deploying (WS8 / WS11 fill in the details)

Cloudflare Pages: build `npm run build`, output `dist`, Node 22. Create the D1 database, bind it as
`DB`, apply `migrations/`, then set the secrets listed at the bottom of `wrangler.toml`.
