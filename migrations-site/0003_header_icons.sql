-- Header icons linked to the SVG icon library (dbsite)
CREATE TABLE IF NOT EXISTS header_icon_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  more INTEGER NOT NULL DEFAULT 0,
  max_width TEXT NOT NULL DEFAULT '200',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO header_icon_settings (id, more, max_width) VALUES (1, 0, '200');

CREATE TABLE IF NOT EXISTS header_icons (
  id TEXT PRIMARY KEY,
  icon_id TEXT,
  name TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  aria_label TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '#',
  color TEXT NOT NULL DEFAULT '',
  color_hover TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_header_icons_position ON header_icons(position);
