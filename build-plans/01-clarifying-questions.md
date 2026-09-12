# Stable Chaos Pitch Site — Clarifying Questions (Pre-Build)

I've read the brief, all five node JSON files, the assets folder, and the marketing site
(`stable-chaos-marketing`: vanilla HTML/CSS/JS, Three.js Halvorsen attractor, Axiforma font,
palette green `#5A9E6F` / green-2 `#7EBF8A` / orange `#E0945A` / peach `#E8B89A` /
yellow `#D4CC8A` / lavender `#9B8ABF` / light `#F0EDE5` / dark `#090909`).

Every question below has a **Default** — what I'll do if you don't answer. Type your answer on the
`> Answer:` line, or just reply "go with defaults" for any section. Questions marked **[BLOCKING]**
materially change the architecture, so those are the ones I most need from you.

---

## A. Hosting, Auth, and Tracking

### A1. [BLOCKING] Cloudflare Pages is fine for this. Which access model do you want?
Cloudflare Pages + Pages Functions (Workers) + D1 (SQLite) can do password gating and per-link
tracking on the free tier (100k function requests/day, D1 free tier is generous). No need to leave
Cloudflare. The question is what "password protected" + "unique links" means together:

- **(a) Unique link is the key.** `https://pitch.example.com/i/<token>` sets a signed HttpOnly
  cookie. No password at all. Simplest for investors. Forwarding is detected by device/location
  drift on the same token.
- **(b) Unique link + one shared passphrase.** Link identifies the investor, a single site-wide
  passphrase (which you'd share verbally / in the email) adds friction to forwarding.
- **(c) Unique link + per-investor passphrase.** Most secure, most admin overhead.
- **(d) Shared password only, no unique links.** (Doesn't meet your tracking goal, listed for completeness.)

**Default:** (b). Unique tokenized links + a single shared passphrase you can rotate. Also a generic
`/enter` page for anyone arriving without a token (passphrase only, tracked as "anonymous").
> Answer:

### A2. Do you have a Cloudflare account with Workers/Pages already, and are you OK with a $5/mo Workers Paid plan if free limits get tight?
**Default:** Assume free tier is enough; design so upgrading is a toggle, not a rewrite.
> Answer:

### A3. What domain/subdomain will this live on?
(e.g. `pitch.stablechaos.com`, `story.stablechaos.com`). Affects cookie scoping and Stream/R2 CORS.
**Default:** Build domain-agnostic; you set it in the Cloudflare dashboard.
> Answer:

### A4. [BLOCKING] Video hosting — which?
- **(a) Cloudflare Stream.** Private videos with signed playback tokens, adaptive bitrate, built-in
  player. ~$5 per 1,000 min stored + $1 per 1,000 min delivered. Cleanest "private + performant" answer.
- **(b) Cloudflare R2 + signed URLs from a Worker.** Cheapest (10 GB free, zero egress), plain
  `<video>` tag with mp4. No adaptive bitrate; fine for short clips.
- **(c) Vimeo / YouTube unlisted.** Fastest to set up, weakest privacy, no per-view tracking.

**Default:** (a) Cloudflare Stream, with an abstraction so `video_link` can be a Stream UID, an
R2 key, or a plain URL and the player component just works.
> Answer:

### A5. Roughly how many videos, how long, and do they exist yet?
Helps me size the player UX (thumbnail grid vs. single hero) and the hosting estimate.
**Default:** Assume ~40–60 clips of 1–3 min each, none ready yet; I'll placeholder every slot.
> Answer:

### A6. What tracking events matter?
Proposed event set: `link_opened`, `passphrase_ok/fail`, `layer_view`, `node_focus`,
`node_blur` (with dwell ms), `video_play/pause/complete` (with % watched), `context_item_open`,
`emphasis_change`, `density_change`, `search`, `session_heartbeat`. Per event: token, session id,
timestamp, IP-derived country/city (Cloudflare gives `cf.country` / `cf.city` for free),
user-agent → device class, screen size, and a browser fingerprint-lite hash for "same link, new device."
**Default:** All of the above. Raw IP stored hashed, not plaintext.
> Answer:

### A7. How do you want to *view* the analytics and *create* links?
- **(a) Admin page inside the site** (`/admin`, protected by an admin secret) — create links,
  see per-link timeline, device/location list, "most viewed nodes", forwarding flags.
- **(b) CLI script / `wrangler d1` queries + CSV export.** No UI.

**Default:** (a), kept deliberately simple in v1 (tables + a timeline, no charts). It's its own
workstream so it doesn't slow the main site.
> Answer:

### A8. Should a link carry the investor's name for on-screen personalization?
e.g. welcome screen reads "Prepared for Founders Fund". Nice touch; also a soft anti-forwarding signal.
**Default:** Yes, optional `label` per link; shown subtly on the welcome state only.
> Answer:

---

## B. Tech Stack

### B1. [BLOCKING] This is an app, not a page. OK to use a build step?
The marketing site is deliberately no-build vanilla. This site has routing, global state
(layer / focused node / emphasis / density / tray open), per-layer layouts, connector lines,
search, animated focus transitions, a video player, and analytics beacons. Doing that in vanilla
is possible but slower to build and harder to split across agents.

**Recommendation:** Vite + React + TypeScript, `motion` (Framer Motion) for the shared-layout
"zoom into node" transitions, plain CSS with the same `:root` tokens as the marketing site (no
Tailwind), Three.js only for the background attractor. Deploys to Cloudflare Pages with
`npm run build`, output `dist/`. Pages Functions live in `functions/`.

Alternatives if you object: Svelte (smaller, equally good for this), or vanilla + a tiny router
(slowest to build well).
**Default:** Vite + React + TS + motion.
> Answer:

### B2. Carry over the Halvorsen attractor background?
**Default:** Yes — full intensity on the welcome state, dimmed/blurred behind layers, paused when
tab is hidden and under `prefers-reduced-motion`. It's the most recognizable brand element.
> Answer:

### B3. Can I `git init` this repo locally (no remote, no push)?
Your marketing template says not to. For a multi-agent build, commits are how I checkpoint each
workstream and roll back a bad one.
**Default:** Yes, init locally only; you create the GitHub remote and Cloudflare Pages project.
> Answer:

### B4. Browser / device targets
**Default:** Modern Chrome/Safari/Edge/Firefox, desktop-first (this is a presenter tool), with a
usable mobile layout (nav and tray become overlays, node grids stack, connector lines hidden).
Investors *will* open links on phones, so it can't be broken there — but it won't be a mobile
showpiece in v1.
> Answer:

---

## C. Site Structure and Navigation

### C1. [BLOCKING] Layer 6 naming and whether it's in the up/down chain
The structure list calls it "Foundational Background"; the layer-style list calls it "Supporting
Context"; the right tray is also "Supporting Context." Is layer 6 a navigable layer (down-arrow
from Products) or is it the aggregate of every node's tray items?
**Default:** Treat layer 6 as a real layer named **"Foundational Background"** (a library of
3rd-party sources that nodes link into), and the right tray as **"Supporting Context"** (the subset
relevant to what's focused). In v1 the down-arrow from Products shows "Explore Foundational
Background" leading to a tasteful "coming soon" state, so the chain feels complete.
> Answer:

### C2. Is the Welcome state "layer 0" — i.e. up-arrow from Who We Are returns to it?
**Default:** Yes. Logo click also returns to it.
> Answer:

### C3. Should every layer and node have a URL?
e.g. `/sectors`, `/sectors/biosecurity`, `/services/starling-intel/red-teaming`. Lets you share a
specific node, lets the browser back button work, and makes analytics per-node trivial.
**Default:** Yes. Emphasis/density are *not* in the URL (they're presenter controls).
> Answer:

### C4. Cross-layer relationships in the focus view?
The data implies a lot of them: President → company; service company → sector; offering → sector;
product → sector; domain → sector. When a node is focused, should there be a "Related" strip of
chips that jump across layers (e.g. focused on Eric Sabo → chip for Growth Curve Bio → chip for
Synthetic Bio)?
**Default:** Yes. A small "Related" strip beneath the focus content, grouped by layer. This is what
makes the site feel like a graph rather than five slideshows.
> Answer:

### C5. Which layers does Compressed / Expanded affect?
Only Sectors (domains) and Services (offerings) have `secondary` nodes.
- Who We Are: all six are `primary`. Should Compressed hide the four presidents?
- Products: all `primary`. Should Compressed hide `slatted` (future) products?
- Beliefs: no tiers.

**Default:** Compressed hides secondaries in Sectors + Services only. Who, Beliefs, Products
unaffected. (Easy to change per-layer later.)
> Answer:

### C6. Presenter conveniences in v1?
- Keyboard: ↑/↓ change layer, ←/→ move between sibling nodes, Enter focus, Esc back, `/` search,
  `[` `]` toggle side panels, `1–4` emphasis.
- A "presentation mode" that collapses both side panels and hides chrome.
**Default:** Yes to keyboard nav; presentation mode = both panels collapsed + a small "P" toggle.
> Answer:

### C7. Search scope
Brief says by name. Including blurbs/bullets is cheap.
**Default:** Search titles first (ranked), then blurb/bullets; results grouped by layer.
> Answer:

### C8. Layer-level content
When you're on a layer with nothing focused, should the center show a layer intro (title, one
paragraph, optional layer video) above the node layout? And should the tray show layer-level
context items?
**Default:** Yes — I'll add a `layers.json` with `title`, `subtitle`, `blurb`, `video_link`,
`context_items` per layer, lorem-filled. This also drives the up/down arrow labels and the left nav
headings.
> Answer:

---

## D. Data / Content

### D1. Where should the JSON live?
**Default:** Move to `/content/*.json` at repo root (imported at build time, so a typo fails the
build instead of the site). You edit there. `prompts/` stays as the original brief.
> Answer:

### D2. May I add fields to the JSON schema (documented in `content/SCHEMA.md`)?
Planned additions: `id` (slug, stable across renames), `sector` on primary service nodes,
`icon` on beliefs + product categories, `gallery: []` + `background_image` on products,
`counters: []` on beliefs (see D6), `order` where the layout needs it.
**Default:** Yes; I'll generate `id` from the title and you can override it.
> Answer:

### D3. Data cleanups — confirm or correct
- `service-nodes.json`: **Triangulum Bio** has `logo_file: "assets/fcp-icon.png"` and **Fountain
  City Partners** has `""`. Looks swapped. **Default:** FCP → `fcp-icon.png`, Triangulum → placeholder.
- Sector naming varies: `"Synthetic Bio"`, `"security"`, `"systems"`, and the control says
  `"SynBio"`. **Default:** Canonical ids `synbio | security | systems`; display labels
  **SynBio / Security / Systems**; loader normalizes case and aliases.
- Possible typos, left verbatim unless you say otherwise: "First Principals" (Principles?),
  "Signals & Spctrum" (Spectrum), `"slatted"` (slated?). **Default:** I'll accept both `slatted`
  and `slated` in the loader; text typos stay as-is since JSON is your source of truth.
> Answer:

### D4. Sector colors — confirm mapping
**Default:** SynBio = green `#5A9E6F`, Security = orange `#E0945A`, Systems = lavender `#9B8ABF`.
Beliefs: Threats = peach/red-shifted, Advantages = green-2. Product stage: `active` = full color +
solid border; `slatted` = dashed border, muted, "Planned" tag.
> Answer:

### D5. Product category icons
Categories present: Bioproduct, Hardware, Software.
**Default:** One line-icon each in the marketing site's stroke style (DNA/flask, chip, code brackets).
> Answer:

### D6. Beliefs: any threat ↔ advantage relationships to draw?
e.g. "Trusted Access" counters "Eroding Knowledge Moats". Would let me draw connector lines
between the left (threats) and right (advantages) clusters.
**Default:** No lines in v1; support an optional `counters: ["<threat title>"]` field on
advantages so you can add them later and lines appear automatically.
> Answer:

### D7. Right-tray `context_items` shape — confirm now so your second pass drops straight in
```json
{
  "type": "article | video | link | pdf | image | quote",
  "title": "",
  "source": "",
  "url": "",
  "thumbnail": "",
  "blurb": "",
  "date": ""
}
```
**Default:** This shape. Tray renders a type-specific card; v1 shows 3 lorem placeholders per node.
> Answer:

### D8. Placeholder media
For empty `video_link`, headshots, logos, galleries, backgrounds: generated SVG/gradient placeholders
in brand colors with a subtle "placeholder" label, or use a stock-style image service?
**Default:** Generated brand-colored placeholders (no external image calls; keeps the site private
and fully offline-buildable).
> Answer:

### D9. Company intro video on the welcome state
Exists yet? **Default:** Placeholder slot; "play" affordance is a small pulsing ring below the tagline.
> Answer:

---

## E. Scope Confirmation for v1

I plan to ship all of this in the first build:
1. Shell: left nav (collapsible, search, layer groups, primary/secondary tiers), center stage,
   right tray (collapsible), persistent Compressed/Expanded control, up/down layer arrows.
2. Welcome state with logo, tagline, attractor, intro-video trigger.
3. Five layers with their distinct layouts, node styles, focus views, connector lines, and the
   SynBio/Security/Systems emphasis control on layers 3–5.
4. Video player with expanded (fills center stage) mode, Stream/R2/URL-agnostic.
5. Placeholder handling for every empty field.
6. Auth gate + tokenized links + tracking beacons + D1 schema + admin page.
7. Cloudflare Pages deployment config and a README for creating links and uploading videos.

Anything you want pulled out of v1 or added?
> Answer:

---

## F. What happens next
Once you answer (or say "defaults"), I'll write `build-plans/02-build-plan.md`: a foundation
pass (scaffold, tokens, data loader, shell, routing, state) done in one context, then parallel
workstreams per layer + auth/tracking + video, each with a self-contained brief a fresh agent can
execute, followed by an integration/QA pass with browser screenshots at desktop and mobile widths.
