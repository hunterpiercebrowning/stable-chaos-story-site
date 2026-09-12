# D1 migrations

Schema for the `DB` binding (`stable-chaos-context`). One file per change, applied in name order.
All timestamps (`created_at`, `expires_at`, `revoked_at`, `started_at`, `last_seen_at`, `ts`) are
**epoch milliseconds**.

```
0001_init.sql   links · sessions · events (+ indexes sessions(link_id), events(link_id, ts), events(session_id))
```

## Create the database (once)

```bash
npx wrangler d1 create stable-chaos-context
```

Paste the returned `database_id` into `wrangler.toml` (`[[d1_databases]]`, binding `DB`). For
Git-connected Pages deploys, also bind `DB` to the same database in the Pages dashboard
(Settings → Functions → D1 database bindings) for Production and Preview.

## Apply

```bash
npm run db:migrate:local     # wrangler d1 migrations apply stable-chaos-context --local   (.wrangler/state)
npm run db:migrate:remote    # wrangler d1 migrations apply stable-chaos-context --remote  (production)
npx wrangler d1 migrations list stable-chaos-context --remote
```

Wrangler records applied files in its own `d1_migrations` table, so re-running is safe.

On a machine where the Workers runtime cannot start (workerd needs macOS 13.5+), the Node fallback
(`npm run dev:api:node`, `npm run seed -- --node`) applies this directory to a local sqlite file
on start; `--remote` still works there because it talks to the Cloudflare API, not workerd.

## Seeding

```bash
npm run seed -- --label "Hunter"              # local D1
npm run seed -- --remote --label "Hunter"     # production; prints https://context.stablechaos.com/i/<token>
```

Or create links from `/admin` (WS9) once deployed.

## Adding a migration

Create `migrations/0002_<name>.sql` with idempotent DDL (`CREATE … IF NOT EXISTS`, `ALTER TABLE …
ADD COLUMN`), apply locally, then remotely on deploy. Never edit an applied file.
