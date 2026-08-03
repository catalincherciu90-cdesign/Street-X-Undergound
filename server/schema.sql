-- Schema GPS Tracker (Cloudflare D1 / SQLite)
-- Aplică cu:  wrangler d1 execute gps-tracker --file=./schema.sql --remote

CREATE TABLE IF NOT EXISTS devices (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  group_name    TEXT    NOT NULL DEFAULT 'General',
  api_key       TEXT    NOT NULL UNIQUE,
  created_at    INTEGER NOT NULL,
  last_seen     INTEGER,
  last_lat      REAL,
  last_lng      REAL,
  last_accuracy REAL,
  last_speed    REAL,
  last_battery  INTEGER
);

CREATE TABLE IF NOT EXISTS locations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id   INTEGER NOT NULL,
  lat         REAL    NOT NULL,
  lng         REAL    NOT NULL,
  accuracy    REAL,
  speed       REAL,
  battery     INTEGER,
  recorded_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_loc_device_time
  ON locations (device_id, recorded_at);

CREATE INDEX IF NOT EXISTS idx_dev_apikey
  ON devices (api_key);
