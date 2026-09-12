-- Stable Chaos context site: links, sessions, events.
-- All *_at / ts columns are epoch milliseconds (Date.now()).

CREATE TABLE IF NOT EXISTS links (
  id          TEXT PRIMARY KEY,
  token       TEXT NOT NULL UNIQUE,
  label       TEXT,
  notes       TEXT,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER,
  revoked_at  INTEGER,
  is_internal INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,
  link_id       TEXT NOT NULL,
  started_at    INTEGER NOT NULL,
  last_seen_at  INTEGER NOT NULL,
  ip_hash       TEXT,
  country       TEXT,
  region        TEXT,
  city          TEXT,
  ua            TEXT,
  device_class  TEXT,
  viewport      TEXT,
  fingerprint   TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  TEXT NOT NULL,
  link_id     TEXT NOT NULL,
  ts          INTEGER NOT NULL,
  type        TEXT NOT NULL,
  layer_id    TEXT,
  node_id     TEXT,
  props       TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_link ON sessions (link_id);
CREATE INDEX IF NOT EXISTS idx_events_link_ts ON events (link_id, ts);
CREATE INDEX IF NOT EXISTS idx_events_session ON events (session_id);
