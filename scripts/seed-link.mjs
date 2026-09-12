#!/usr/bin/env node
/**
 * Seed one internal invitation link into D1 and print its `/i/<token>` URL.
 *
 *   node scripts/seed-link.mjs                     # local D1 (.wrangler/state), applies migrations first
 *   node scripts/seed-link.mjs --label "Hunter"    # custom label (default: "Internal")
 *   node scripts/seed-link.mjs --origin http://localhost:5173
 *   node scripts/seed-link.mjs --remote            # production D1 (asks wrangler for auth)
 *   node scripts/seed-link.mjs --no-migrate        # skip `d1 migrations apply`
 *
 * Or: `npm run seed -- --label "Hunter"`.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const DB_NAME = 'stable-chaos-context';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};

const remote = flag('remote');
const target = remote ? '--remote' : '--local';
const label = opt('label', 'Internal');
const notes = opt('notes', 'Seeded by scripts/seed-link.mjs');
const origin = opt('origin', remote ? 'https://context.stablechaos.com' : 'http://127.0.0.1:8788');

function wrangler(cmdArgs) {
  const res = spawnSync('npx', ['wrangler', ...cmdArgs], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  if (res.status !== 0) {
    process.stderr.write(res.stdout ?? '');
    process.stderr.write(res.stderr ?? '');
    process.exit(res.status ?? 1);
  }
  return res.stdout;
}

const id = randomUUID();
const token = randomBytes(24).toString('base64url');
const now = Date.now();
const esc = (s) => String(s).replace(/'/g, "''");
const sql = `INSERT INTO links (id, token, label, notes, created_at, expires_at, revoked_at, is_internal) VALUES ('${id}', '${token}', '${esc(label)}', '${esc(notes)}', ${now}, NULL, NULL, 1);`;

if (!flag('no-migrate')) {
  process.stderr.write(`Applying migrations (${target})…\n`);
  wrangler(['d1', 'migrations', 'apply', DB_NAME, target]);
}
process.stderr.write(`Inserting link ${id} (${target})…\n`);
wrangler(['d1', 'execute', DB_NAME, target, '--command', sql]);

process.stdout.write(`${origin}/i/${token}\n`);
process.stderr.write(`link id: ${id}\n`);
