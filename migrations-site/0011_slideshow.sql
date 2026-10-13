CREATE TABLE IF NOT EXISTS slideshow_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  animation TEXT NOT NULL DEFAULT 'fade',
  autoplay INTEGER NOT NULL DEFAULT 1,
  autoplay_interval INTEGER NOT NULL DEFAULT 7000,
  finite INTEGER NOT NULL DEFAULT 0,
  pause_on_hover INTEGER NOT NULL DEFAULT 1,
  velocity REAL NOT NULL DEFAULT 1,
  ratio TEXT NOT NULL DEFAULT '16:9',
  min_height TEXT NOT NULL DEFAULT '',
  max_height TEXT NOT NULL DEFAULT '',
  idx INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO slideshow_settings (id) VALUES (1);

CREATE TABLE IF NOT EXISTS slideshow_slides (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL DEFAULT 1,
  alt TEXT NOT NULL DEFAULT '',
  media_kind TEXT NOT NULL DEFAULT 'image',
  version TEXT NOT NULL DEFAULT '',
  mobile_crop_json TEXT NOT NULL DEFAULT '',
  files_json TEXT NOT NULL DEFAULT '{}',
  layer_json TEXT NOT NULL DEFAULT '',
  library_asset_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_slideshow_slides_position ON slideshow_slides(position);
