/**
 * A tiny D1-shaped wrapper over `node:sqlite`, enough for `functions/`:
 * `prepare().bind().first()/run()/all()` and `batch()`. Used by the Node
 * fallback API server and by `seed-link.mjs --node` on machines where the
 * Cloudflare Workers runtime (workerd) cannot run.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const DEFAULT_DB_FILE = '.wrangler/state/node-d1/stable-chaos-context.sqlite';

function toNamed(params) {
  // Node 22 treats `?N` as named parameters bound from an object keyed by N.
  const out = {};
  params.forEach((v, i) => {
    out[String(i + 1)] = v === undefined ? null : v;
  });
  return out;
}

class Statement {
  constructor(db, sql, params = []) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }
  bind(...params) {
    return new Statement(this.db, this.sql, params);
  }
  #stmt() {
    return this.db.prepare(this.sql);
  }
  async first(column) {
    const row = this.#stmt().get(toNamed(this.params));
    if (row === undefined) return null;
    return column ? (row[column] ?? null) : { ...row };
  }
  async all() {
    const rows = this.#stmt().all(toNamed(this.params)).map((r) => ({ ...r }));
    return { results: rows, success: true, meta: {} };
  }
  async run() {
    const info = this.#stmt().run(toNamed(this.params));
    return { results: [], success: true, meta: { changes: info.changes, last_row_id: info.lastInsertRowid } };
  }
}

export function openD1(file = DEFAULT_DB_FILE) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  return {
    prepare: (sql) => new Statement(db, sql),
    async batch(statements) {
      db.exec('BEGIN');
      try {
        const out = [];
        for (const s of statements) out.push(/^\s*(select|with)/i.test(s.sql) ? await s.all() : await s.run());
        db.exec('COMMIT');
        return out;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    async exec(sql) {
      db.exec(sql);
      return { count: 0, duration: 0 };
    },
    raw: db,
  };
}

/** Apply `migrations/*.sql` in name order, remembering which ran (like wrangler's d1_migrations). */
export function applyMigrations(d1, dir = 'migrations') {
  const db = d1.raw;
  db.exec('CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TEXT)');
  const done = new Set(db.prepare('SELECT name FROM d1_migrations').all().map((r) => r.name));
  const applied = [];
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    if (done.has(name)) continue;
    db.exec(readFileSync(join(dir, name), 'utf8'));
    db.prepare('INSERT INTO d1_migrations (name, applied_at) VALUES (?, ?)').run(name, new Date().toISOString());
    applied.push(name);
  }
  return applied;
}
