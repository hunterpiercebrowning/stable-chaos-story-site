# D1 migrations

Owned by **WS8**. `0001_init.sql` will create `links`, `sessions` and `events`
(schema in `build-plans/02-build-plan.md` §5.8).

Apply locally:  `npx wrangler d1 migrations apply stable-chaos-context --local`
Apply remotely: `npx wrangler d1 migrations apply stable-chaos-context --remote`
