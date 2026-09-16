# Content Schema

Everything the site renders comes from the JSON files in this folder. They are imported at build
time by `src/data/loader.ts`; nothing else in the app may import them directly.

Rules that apply to **every** node file:

- The file is a JSON array of node objects.
- `id` — required, unique **across the whole site** (it is the `:nodeId` URL segment). Kebab-case of
  the title/name. Do not change an `id` after a link has been shared; it is the stable handle.
- Array order is the display order. `order` may be set explicitly on a node to override it; when
  absent the loader assigns the array index.
- Text fields (`tagline`, `blurb`, `bullet_points`) are shown exactly as authored. An empty string
  or empty array renders nothing at all: the slot is dropped from the card and the focus panel, so a
  node may ship with only the fields it needs.
- Image and video slots still fall back to a generated-SVG placeholder (seeded by `id`, so it is
  stable between reloads). Fill the field to replace it.
- `context_items` is an array of context items (shape at the bottom). Empty → the right tray shows
  its empty state.
- `video_link` accepts a Cloudflare Stream UID (32 hex), a `*.cloudflarestream.com` URL, an
  `r2:<key>` reference, a plain `.mp4`/`.webm` URL, or `""` (placeholder poster).
- Image paths are absolute web paths into `public/`, e.g. `/assets/logos/gcb-logo.svg`.

## Sectors: canonical ids

There are exactly three sectors. Everywhere a sector is referenced, use the **id**.

| id | label (tags) | display title | color token |
|---|---|---|---|
| `synbio` | SynBio | Synthetic Bio | `--sector-synbio` `#5A9E6F` |
| `security` | NatSec | National Security | `--sector-security` `#E0945A` |
| `systems` | Systems | Systems | `--sector-systems` `#9B8ABF` |

The loader also accepts these legacy aliases and normalizes them: `Synthetic Bio`, `synthetic bio`,
`SynBio`, `Security`, `NatSec`, `Nat Sec`, `National Security`, `Systems` (any case).

## `layers.json`

```json
{ "id": "sectors", "order": 3, "title": "Critical Sectors", "shortTitle": "Sectors",
  "path": "/sectors", "nodesFile": "sectors-nodes.json", "hasDensity": true }
```

| field | notes |
|---|---|
| `id` | layer key; also the `:layerId` URL segment and the `src/layers/registry.ts` key |
| `order` | 0–6, the up/down arrow sequence |
| `title` | shown in the stage header |
| `shortTitle` | left nav / breadcrumb / related-strip grouping |
| `path` | route |
| `nodesFile` | file in this folder, or `null` (welcome). Informational: the loader imports the files itself. Our Holdings (`holdings`) lists both of its files |
| `hasDensity` | The layer offers the Overview / Examples toggle (shown in the top bar only while it is active). Layers without it always render compressed: their `secondary` nodes stay folded on the stage and in the nav |
| `subtitle` | optional; shown under the stage title. Absent/empty → no subtitle |
| `videoLink` | optional; a layer-wide video (same forms as `video_link`). Absent/empty → no play button beside the title |

## `who-nodes.json`

| field | type | notes |
|---|---|---|
| `id` | string | kebab of `name` |
| `type` | `"founder"` \| `"leader"` \| `"expert"` | the Who We Are row; anything else → founder for Stable Chaos, else leader |
| `name` | string | |
| `title` | string | job title, e.g. Co-Founder, Head of Intelligence |
| `company` | string | display name of the company |
| `headshot_file` | string | `/assets/headshots/…`; empty → generated headshot placeholder |
| `blurb` | string | bio paragraph |
| `bullet_points` | string[] | resume items |
| `video_link` | string | |
| `context_items` | ContextItem[] | |

## `beliefs-nodes.json`

| field | type | notes |
|---|---|---|
| `id` | string | |
| `type` | `"threat"` \| `"disruption"` \| `"advantage"` | drives the column (left → right) and color |
| `title` | string | |
| `icon` | string | `Icon` sprite name; empty → the layer picks a default per belief |
| `tagline`, `blurb` | string | |
| `bullet_points` | string[] | |
| `video_link`, `context_items` | | |

## `sectors-nodes.json`

| field | type | notes |
|---|---|---|
| `id` | string | primary sector nodes use the canonical sector id (`synbio`/`security`/`systems`) |
| `type` | `"primary"` (Sector) \| `"secondary"` (Domain) | |
| `title` | string | |
| `sector` | SectorId | **primary only**, equals `id` |
| `background_image` | string | **primary only**; photo behind the sector band under Compressed density (`/assets/backgrounds/…`); empty → generated sector motif |
| `related_sectors` | SectorId[] | **secondary only**, 1–2 entries; drives connectors and dual styling |
| `tagline`, `blurb`, `bullet_points`, `video_link`, `context_items` | | |

## `service-nodes.json`

The service companies and their offerings. They render on the **Our Holdings** layer (`holdings`) together
with `product-nodes.json`; every node from this file gets `kind: "service"` in the app, every node from the
products file `kind: "product"`. Node ids must be unique across both files.

| field | type | notes |
|---|---|---|
| `id` | string | |
| `type` | `"primary"` (Company) \| `"secondary"` (Offering) | |
| `title` | string | |
| `sector` | SectorId | on **both** tiers |
| `website` | string | primary only; opens in a new tab |
| `logo_file` | string | primary only; empty → `Placeholder variant="logo"` |
| `company` | string | secondary only — the **node id** of its parent company |
| `background_image` | string | secondary only; scene behind the offering focus, revealed on card hover (`/assets/backgrounds/services/…`); empty → plain glass |
| `tagline`, `blurb`, `bullet_points`, `video_link`, `context_items` | | |

Two offering ids are suffixed with their company because the bare kebab is already taken by a
Sectors domain node: `molecular-engineering-growth-curve-bio`, `operations-fountain-city-partners`.

Overview shows one hero card per company; Examples lists the offerings at the front of their sector's band,
ahead of the products, and puts a company chip in the band header. Starling Intel and its offerings were
removed from this file on 2026-09-16 (recoverable from git history).

## `product-nodes.json`

| field | type | notes |
|---|---|---|
| `id` | string | primary ids are `<sector>-products` (the bare sector id is taken by the Sectors layer) |
| `type` | `"primary"` (Sector summary) \| `"secondary"` (Product) | one primary per sector; each product nests under the primary with the same `sector` |
| `title` | string | primary: the sector label, e.g. `SynBio` |
| `sector` | SectorId | on **both** tiers; drives the band, color and the product → summary link |
| `stage` | `"active"` \| `"slated"` | **secondary only**. active = solid; slated = dashed, muted, "Slated" tag. The loader also accepts the legacy spelling `"slatted"`. |
| `category` | `"Bioproduct"` \| `"Hardware"` \| `"Software"` | **secondary only**; picks the node icon |
| `background_image` | string | environment photo behind the focus frame (primary: also the card backdrop under Compressed); empty → generated scene / sector motif |
| `gallery` | string[] | **secondary only**; 3–5 image paths; empty → generated placeholders |
| `tagline`, `blurb`, `bullet_points`, `video_link`, `context_items` | | primary `tagline` is the summary on the Compressed card |

On Our Holdings, Overview (Compressed) shows the three primaries as summary cards under the company
cards; Examples (Expanded) shows the sector bands, whose titles open the primary, with the sector's
service offerings ahead of its products.

## `background-nodes.json`

| field | type | notes |
|---|---|---|
| `id` | string | |
| `type` | `"primary"` | the only tier |
| `title` | string | card headline and focus title |
| `tagline`, `blurb`, `bullet_points` | | as elsewhere |
| `source_url` | string | **the node's source.** The kind is detected from the URL: YouTube (`watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/`) → video; `x.com` / `twitter.com` `/status/<id>` → X post; any other http(s) URL → article (a `.pdf` path or PDF response → PDF). Empty → the card falls back to the lead context item |
| `source_name` | string | optional; overrides the fetched publication / YouTube channel / X author name |
| `source_date` | string | optional; overrides the fetched date. ISO dates are formatted (`Apr 2, 2025`), anything else is shown as written |
| `thumbnail` | string | optional; overrides the fetched image (article OG image, YouTube thumbnail, first X photo) |
| `video_link` | string | optional. A YouTube `video_link` doubles as the source when `source_url` is empty; any other video link adds the usual Watch button under the source |
| `context_items` | ContextItem[] | optional. Not needed when `source_url` is set: the tray then says the source is in the focus panel |

Previews are fetched by `GET /api/unfurl?url=` (`functions/api/unfurl.ts`): YouTube oEmbed, X's public
syndication data, and Open Graph tags for articles. Results are cached at the edge for a day. Some
publishers block preview fetches; the card then shows the hostname and the node title, so fill
`source_name`, `source_date` and `thumbnail` for those.

- **Grid card:** video → thumbnail with play ring, channel; article/PDF → OG image or PDF tile,
  publication · date; X post → avatar, name, @handle, post text, first photo, date. The node `title`
  and `tagline` are the headline and summary (an X card shows the post text instead).
- **Focus:** the copy, then the source embedded: the YouTube player (poster swaps to the player in
  place), the full X post with counts linking to x.com, or the article preview linking out.

An empty array renders a designed "coming soon" state.

## Context item

Used by every node's `context_items` array; rendered in the right tray under "Supporting Context".

```json
{
  "type": "article",
  "title": "",
  "source": "",
  "url": "",
  "thumbnail": "",
  "blurb": "",
  "date": ""
}
```

| field | notes |
|---|---|
| `type` | `article` \| `video` \| `link` \| `pdf` \| `image` \| `quote` — picks the card layout |
| `title` | headline / quote text |
| `source` | publication, author, or domain |
| `url` | opened in a new tab; tracked as `context_item_open` |
| `thumbnail` | image path; empty → generated placeholder in the node's sector color |
| `blurb` | one- or two-sentence summary |
| `date` | free text or ISO date; shown as a small label |
