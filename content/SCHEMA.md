# Content Schema

Everything the site renders comes from the JSON files in this folder. They are imported at build
time by `src/data/loader.ts`; nothing else in the app may import them directly.

Rules that apply to **every** node file:

- The file is a JSON array of node objects.
- `id` — required, unique **across the whole site** (it is the `:nodeId` URL segment). Kebab-case of
  the title/name. Do not change an `id` after a link has been shared; it is the stable handle.
- Array order is the display order. `order` may be set explicitly on a node to override it; when
  absent the loader assigns the array index.
- Any empty string / empty array is rendered with a deterministic lorem or generated-SVG
  placeholder (seeded by `id`, so it is stable between reloads). Fill the field to replace it.
- `context_items` is an array of context items (shape at the bottom). Empty → the right tray shows
  three lorem placeholders.
- `video_link` accepts a Cloudflare Stream UID (32 hex), a `*.cloudflarestream.com` URL, an
  `r2:<key>` reference, a plain `.mp4`/`.webm` URL, or `""` (placeholder poster).
- Image paths are absolute web paths into `public/`, e.g. `/assets/logos/gcb-logo.svg`.

## Sectors: canonical ids

There are exactly three sectors. Everywhere a sector is referenced, use the **id**.

| id | label (tags, emphasis control) | display title | color token |
|---|---|---|---|
| `synbio` | SynBio | Synthetic Bio | `--sector-synbio` `#5A9E6F` |
| `security` | Security | Security | `--sector-security` `#E0945A` |
| `systems` | Systems | Systems | `--sector-systems` `#9B8ABF` |

The loader also accepts these legacy aliases and normalizes them: `Synthetic Bio`, `synthetic bio`,
`SynBio`, `Security`, `Systems` (any case).

## `layers.json`

```json
{ "id": "sectors", "order": 3, "title": "Critical Sectors", "shortTitle": "Sectors",
  "path": "/sectors", "nodesFile": "sectors-nodes.json", "hasEmphasis": true, "hasDensity": true }
```

| field | notes |
|---|---|
| `id` | layer key; also the `:layerId` URL segment and the `src/layers/registry.ts` key |
| `order` | 0–6, the up/down arrow sequence |
| `title` | shown in the stage header |
| `shortTitle` | left nav / breadcrumb / related-strip grouping |
| `path` | route |
| `nodesFile` | file in this folder, or `null` (welcome) |
| `hasEmphasis` | show the All/SynBio/Security/Systems segmented control; non-matching nodes dim |
| `hasDensity` | Compressed collapses this layer's `secondary` nodes |

## `who-nodes.json`

| field | type | notes |
|---|---|---|
| `id` | string | kebab of `name` |
| `type` | `"primary"` | founders and presidents are all primary |
| `name` | string | |
| `title` | string | e.g. Co-Founder, President |
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
| `type` | `"threat"` \| `"advantage"` | drives cluster side and color |
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
| `related_sectors` | SectorId[] | **secondary only**, 1–2 entries; drives connectors and dual styling |
| `tagline`, `blurb`, `bullet_points`, `video_link`, `context_items` | | |

## `service-nodes.json`

| field | type | notes |
|---|---|---|
| `id` | string | |
| `type` | `"primary"` (Company) \| `"secondary"` (Offering) | |
| `title` | string | |
| `sector` | SectorId | on **both** tiers |
| `website` | string | primary only; opens in a new tab |
| `logo_file` | string | primary only; empty → `Placeholder variant="logo"` |
| `company` | string | secondary only — the **node id** of its parent company |
| `tagline`, `blurb`, `bullet_points`, `video_link`, `context_items` | | |

Two offering ids are suffixed with their company because the bare kebab is already taken by a
Sectors domain node: `molecular-engineering-triangulum-bio`, `operations-fountain-city-partners`.

## `product-nodes.json`

| field | type | notes |
|---|---|---|
| `id` | string | |
| `type` | `"primary"` | one tier only |
| `title` | string | |
| `sector` | SectorId | drives the band and color |
| `stage` | `"active"` \| `"slated"` | active = solid; slated = dashed, muted, "Planned" tag. The loader also accepts the legacy spelling `"slatted"`. |
| `category` | `"Bioproduct"` \| `"Hardware"` \| `"Software"` | picks the node icon |
| `background_image` | string | environment photo behind the focus frame; empty → generated gradient scene |
| `gallery` | string[] | 3–5 image paths; empty → generated placeholders |
| `tagline`, `blurb`, `bullet_points`, `video_link`, `context_items` | | |

## `background-nodes.json`

Currently `[]`. The Foundational Background layer renders a designed "coming soon" state until
nodes land here. Expected shape when it is filled: `id`, `type: "primary"`, `title`, `tagline`,
`blurb`, `bullet_points`, `video_link`, `context_items`.

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
