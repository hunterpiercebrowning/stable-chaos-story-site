# Phase 3 handoff — real content, context items, Foundational Background

Written by WS11 at the end of Phase 2. Everything in the site renders today; what it renders is
lorem and generated art wherever the JSON is empty. This document says **exactly which fields to
fill, per layer, in what order**, what changes on screen when each one lands, which "placeholder"
labels remain until then, and which UI elements should become content-dependent in the go-live
pass. Field names are the JSON (snake_case) names from `content/SCHEMA.md`.

Ground rules (unchanged from Phase 0):

- `id` is the URL and the tracking key. Never rename one after a link has gone out.
- Array order is display order. Move objects to reorder; `order` is optional.
- An empty string / empty array always means "show the placeholder". There is no separate
  "hide this" value — see §4 for the elements that should learn one.
- Image paths are absolute web paths under `public/` (`/assets/...`). Add files under
  `public/assets/<kind>/` (suggested new folders: `context/`, `products/`, `scenes/`).

---

## 1. What is empty today

Counts are "empty / total" from the current JSON (2026-09-12).

| File | Nodes | Empty fields |
|---|---|---|
| `who-nodes.json` | 6 | `blurb` 3/6 · `bullet_points` 6/6 · `video_link` 6/6 · `context_items` 6/6 |
| `beliefs-nodes.json` | 7 | `icon` 7/7 (the layer picks a default per id — fine to leave) · `tagline` 7/7 · `blurb` 7/7 · `bullet_points` 7/7 · `video_link` 7/7 · `context_items` 7/7 |
| `sectors-nodes.json` | 21 | `tagline` · `blurb` · `bullet_points` · `video_link` · `context_items` — all 21/21 |
| `service-nodes.json` | 25 | `logo_file` 1/4 (Triangulum) · `tagline` · `blurb` · `bullet_points` · `video_link` · `context_items` — all 25/25 |
| `product-nodes.json` | 23 | `tagline` · `blurb` · `bullet_points` · `video_link` · `background_image` · `gallery` · `context_items` — all 23/23 |
| `background-nodes.json` | 0 | the whole file (`[]`) |

Everything else (names, titles, roles, companies, headshots, websites, sectors, related sectors,
stages, categories, three of four logos) is real.

---

## 2. Fill order, per layer

Suggested order: the copy investors read first, then the sources, then video, then the
Foundational Background layer. Each item names the file/component that renders the field.

### Who We Are (`who-nodes.json`)

| Field | Where it shows | While empty |
|---|---|---|
| `blurb` (3 missing) | `WhoFocus` body | 45–70-word lorem seeded by id |
| `bullet_points` (4–6 items, ≤ 14 words each) | `WhoFocus` bullets | 4–6 lorem bullets |
| `video_link` | "Meet <first name>" row under the headshot in `WhoFocus` (`FocusFrame` media column) | poster placeholder with a "placeholder" note; expands to "Video placeholder — no source yet" |
| `context_items` | right tray | 3 lorem cards labelled "placeholder" |
| `headshot_file` | all six are real; nothing to do | — |

### What We Believe (`beliefs-nodes.json`)

| Field | Where it shows | While empty |
|---|---|---|
| `tagline` (6–10 words) | `BeliefsFocus` subtitle | lorem |
| `blurb` | `BeliefsFocus` body | lorem |
| `bullet_points` | `BeliefsFocus` bullets | lorem |
| `icon` | belief card + focus eyebrow | `src/layers/beliefs/beliefs.ts#beliefIcon` picks key / consilience / atom / crosshair / chip / castle / globe by id — set only if you want a different sprite name |
| `video_link`, `context_items` | as above | as above |

### Critical Sectors (`sectors-nodes.json`)

| Field | Where it shows | While empty |
|---|---|---|
| `tagline` | `SectorsFocus` subtitle | lorem |
| `blurb`, `bullet_points` | `SectorsFocus` | lorem |
| `video_link`, `context_items` | as above | as above |

`related_sectors` on domains drive the connectors and dual styling and are already correct.

### Services (`service-nodes.json`)

| Field | Where it shows | While empty |
|---|---|---|
| `logo_file` on `triangulum-bio` | company card tile, focus logo, offering eyebrow chip, related chips | `Placeholder variant="logo"` ("TB" monogram; the focus view carries the "placeholder" tag) — drop the SVG into `public/assets/logos/` and set the path |
| `tagline`, `blurb`, `bullet_points` | `ServicesFocus` (company and offering) | lorem |
| `video_link` | company: under the logo (media column); offering: row under the bullets | placeholder poster |
| `context_items` | right tray | lorem |

### Products (`product-nodes.json`)

| Field | Where it shows | While empty |
|---|---|---|
| `tagline`, `blurb`, `bullet_points` | `ProductsFocus` | lorem |
| `background_image` (1600×900 or wider, dark, left side calm) | environment scene behind the glass frame in `ProductsFocus` | generated gradient scene seeded by id, with a "placeholder" tag at the top-right of the scene |
| `gallery` (3–5 paths, 3:2 works best) | thumb strip beside the video row; lightbox | 3–5 generated placeholders; one "placeholder" label in the gallery head |
| `video_link`, `context_items` | as above | as above |

### Foundational Background (`background-nodes.json`)

Currently `[]`, so `BackgroundLayer` renders the designed "coming soon" state (six ghost source
cards). The first node you add flips the layer to the generic card grid (`GenericLayer` /
`GenericFocus`) automatically — no code change. Node shape:

```json
{
  "id": "biosecurity-primer",
  "type": "primary",
  "title": "Biosecurity primer",
  "tagline": "",
  "blurb": "",
  "bullet_points": [],
  "video_link": "",
  "context_items": []
}
```

Before go-live decide whether the layer should stay a grid of nodes (then a purpose-built
`src/layers/background/*` like the other layers is the next build task) or become a flat list of
sources; the ghost-card design in `BackgroundLayer.tsx` is the visual reference either way.

---

## 3. Context items (the right tray)

Every node's `context_items` array; shape and card layouts in `content/SCHEMA.md` and
`src/components/ContextCard.tsx`. Per type, the fields that matter:

| `type` | Required | Optional | Notes |
|---|---|---|---|
| `article` | `title`, `source`, `url` | `thumbnail`, `blurb`, `date` | wide thumb, source · date, title, blurb |
| `pdf` | `title`, `source`, `url` | `blurb`, `date` | document tile |
| `link` | `title`, `url` | `source` | domain is derived from `url`; `source` is the fallback |
| `video` | `title`, `url` | `thumbnail`, `source`, `date` | `url` follows the `video_link` rules (Stream UID preferred); opens the full-screen player |
| `image` | `title`, `thumbnail` | `source`, `date`, `url` | thumb-led card with a caption overlay |
| `quote` | `title` (the quote), `source` (attribution) | `date`, `url` | large quote mark, accent rule |

What changes when the first real item lands on a node: `getContextItems()` returns the real
array instead of three lorem items, the "placeholder" note on the cards disappears
(`RightTray.tsx` passes `placeholder={node.contextItems.length === 0}`), and the tray count pill
shows the real number. Items with a `url` become links (tracked as `context_item_open`); items
without one render as inert cards.

---

## 4. Placeholder labels and the elements that should become content-dependent

Today every placeholder carries a small uppercase "placeholder" label so it is obvious in review.
They all key off the empty field and vanish when it is filled. The list — with the file that
controls each — doubles as the go-live checklist of elements that should **hide instead of
showing a placeholder** once real content is the norm:

| Element | Controlled in | Today | Go-live behaviour to implement |
|---|---|---|---|
| Welcome "Watch the introduction" ring + "placeholder" note | `src/layers/welcome/WelcomeLayer.tsx` (`INTRO_NODE.videoLink`) | always shown, opens the placeholder player | make the intro `video_link` a real field (e.g. `layers.json` welcome entry or a `content/welcome.json`) and hide the ring while it is empty |
| Video row in every focus view | each `*Focus.tsx` passes `<VideoPlayer node={node} />` into `FocusFrame` `extras`; note text in `src/components/VideoPlayer.tsx` (`note`) | poster + "placeholder" note; expands to "no source yet" | render the `VideoPlayer` only when `resolveVideoSource(node.videoLink).kind !== 'none'` — one condition per Focus file, or a `hideWhenEmpty` prop on `VideoPlayer` |
| Tray placeholder cards | `src/shell/RightTray.tsx` + `src/data/index.ts#getContextItems` | 3 lorem cards, "placeholder" note | return `[]` from `getContextItems` and let the tray's per-layer empty-state hint (`HINT` map in `RightTray.tsx`) show instead |
| Lorem tagline / blurb / bullets | `src/data/index.ts#getCopy` (`isPlaceholder`) | lorem text, no label | keep lorem for review builds; for go-live make `getCopy` return empty strings so `FocusFrame` omits the subtitle / body / bullets blocks (it already skips empty slots) |
| Products scene | `src/layers/products/ProductsFocus.tsx` (`hasScene`) | generated gradient + "placeholder" tag | keep the generated scene (it is on-brand) but drop the tag: remove the `sc-placeholder-tag` span |
| Products gallery | `ProductsFocus.tsx` (`hasGallery`) + `ProductsGallery.tsx` (`placeholder`) | generated thumbs + one "placeholder" label | render the gallery only when `node.gallery.length > 0` |
| Triangulum logo | `src/layers/services/ServicesNode.tsx#CompanyLogo` | monogram placeholder; tag on the focus view | resolved by adding the file; no code |
| Missing headshots | `src/layers/who/WhoNode.tsx` / `WhoFocus.tsx` | generated headshot | none missing today; leave the fallback |
| Context-card thumbnails | `src/components/ContextCard.tsx` | generated art per node sector when `thumbnail` is empty | acceptable to keep |
| Background "coming soon" | `src/layers/background/BackgroundLayer.tsx` | designed empty state | flips automatically on the first node (see §2) |
| Placeholder tag style | `src/styles/base.css` `.sc-placeholder-tag`, `.ctx-note`, `.video-note`, `.products-gallery-note`, `.welcome-intro-note` | visible | a single `body[data-review]`-style switch would let you keep the labels in internal builds and hide them for investors; today they are unconditional |

Related strips, connectors, emphasis, density, search and the left index are all data-driven and
need nothing.

---

## 5. Videos

Per node: upload to Cloudflare Stream, turn on **Require signed URLs**, paste the 32-character UID
into `video_link`. Setup (customer code, signing key, secrets) is in `README.md` §7. Until the
Stream secrets exist the player falls back to an unsigned embed and shows a visible pill, which
only works for videos that do *not* require signed URLs — so set the secrets before flipping the
first video to signed. Plain `https://…mp4` links work today with no setup (verified during WS11
with a public sample clip: play, pause, resume, 25/50/75 progress and complete all tracked).

---

## 6. When the copy lands: what to re-check

- Focus views are sized for ~60-word blurbs and five bullets at 1440×900 with both panels open;
  longer copy scrolls inside the frame (by design). If a layer's real copy is consistently longer,
  the knobs are in `src/components/focus-frame.css` (`.focus-body`, `.focus-bullets`,
  `.focus-extras`) — not in the layers.
- Search ranks titles first, then blurb/bullets; real copy will change what `/` finds.
- Admin "Most viewed nodes" and the timeline resolve node titles from the JSON, so retitling a
  node retitles its history; changing an `id` orphans it.
- Re-run `npm run test` — the data tests assert the sector aliases, unique ids and related-graph
  symmetry, which is exactly what a content edit can break.
