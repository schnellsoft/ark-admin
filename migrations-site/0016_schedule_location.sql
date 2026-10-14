CREATE TABLE IF NOT EXISTS schedule_days (
  day INTEGER PRIMARY KEY CHECK (day BETWEEN 1 AND 7),
  open_time TEXT NOT NULL DEFAULT '',
  close_time TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO schedule_days (day, open_time, close_time) VALUES
  (1, '', ''),
  (2, '', ''),
  (3, '', ''),
  (4, '', ''),
  (5, '', ''),
  (6, '', ''),
  (7, '', '');

CREATE TABLE IF NOT EXISTS location_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  latitude TEXT NOT NULL DEFAULT '',
  longitude TEXT NOT NULL DEFAULT '',
  google_maps_key TEXT NOT NULL DEFAULT '',
  building_library_id TEXT,
  building_master_key TEXT NOT NULL DEFAULT '',
  building_webp_key TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO location_settings (id) VALUES (1);
