-- Theru demo — SQLite schema (schema version 1)
--
-- One database per demo install. Every table is created with IF NOT EXISTS and
-- the database is seeded exactly once per dataset version (see server/seed.ts).
-- Foreign keys are enabled on every connection in server/db.ts.
--
-- Single-user by design: there is no users/tenants table. `workspace` holds the
-- one implicit demo workspace (id = 1). Accounts, signals and districts are
-- synthetic demo data and are never edited by the app; user edits live in
-- saved_accounts, pipeline, notes, route_stops and workspace.

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS districts (
  name              TEXT PRIMARY KEY,
  region            TEXT NOT NULL CHECK (region IN ('North', 'Central', 'West', 'South')),
  growth            REAL NOT NULL,
  tier              INTEGER NOT NULL,
  character         TEXT NOT NULL,
  momentum          INTEGER NOT NULL,
  avg_score         INTEGER NOT NULL,
  hotspot           TEXT NOT NULL,
  pulse_json        TEXT NOT NULL, -- JSON array of 12 monthly pulse values
  top_sectors_json  TEXT NOT NULL  -- JSON [{ name, count }]
);

CREATE TABLE IF NOT EXISTS accounts (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  sector          TEXT NOT NULL,
  sub_sector      TEXT NOT NULL,
  district        TEXT NOT NULL REFERENCES districts(name),
  locality        TEXT NOT NULL,
  employees       INTEGER NOT NULL,
  revenue_cr      REAL NOT NULL,
  founded_year    INTEGER NOT NULL,
  fit             INTEGER NOT NULL,
  momentum        INTEGER NOT NULL,
  footprint       INTEGER NOT NULL,
  reach           INTEGER NOT NULL,
  score           INTEGER NOT NULL, -- weighted score, stored so SQL can sort on it
  contact_name    TEXT NOT NULL,
  contact_role    TEXT NOT NULL,
  contact_email   TEXT NOT NULL,    -- sanitised to a *.invalid demo address at seed time
  contact_phone   TEXT NOT NULL,    -- sanitised to a reserved +91 00000 range at seed time
  website         TEXT,
  owner           TEXT NOT NULL,
  seed_status     TEXT NOT NULL CHECK (seed_status IN ('new', 'contacted', 'meeting', 'customer')),
  last_touch_days INTEGER NOT NULL,
  potential_l     REAL NOT NULL,
  account_tier    TEXT NOT NULL,
  seed_notes      TEXT NOT NULL DEFAULT '',
  spotlight       INTEGER NOT NULL DEFAULT 0,
  brief_rank      INTEGER
);

CREATE INDEX IF NOT EXISTS accounts_district ON accounts(district);
CREATE INDEX IF NOT EXISTS accounts_sector ON accounts(sector);
CREATE INDEX IF NOT EXISTS accounts_score ON accounts(score DESC);
CREATE INDEX IF NOT EXISTS accounts_name ON accounts(name);

CREATE TABLE IF NOT EXISTS signals (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  ordinal     INTEGER NOT NULL,
  type        TEXT NOT NULL,
  label       TEXT NOT NULL,
  date        TEXT NOT NULL,
  days_ago    INTEGER NOT NULL,
  weight      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS signals_account ON signals(account_id, ordinal);

-- The single demo workspace. One row, enforced by the CHECK.
CREATE TABLE IF NOT EXISTS workspace (
  id             INTEGER PRIMARY KEY CHECK (id = 1),
  route_date     TEXT NOT NULL,
  following_json TEXT NOT NULL, -- JSON array of district names
  updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_accounts (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pipeline (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  stage      TEXT NOT NULL CHECK (stage IN ('new', 'contacted', 'meeting', 'customer')),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS route_stops (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL
);
