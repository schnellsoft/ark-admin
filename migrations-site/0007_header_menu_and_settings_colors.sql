-- Global color settings for header icons strip
ALTER TABLE header_icon_settings ADD COLUMN color TEXT NOT NULL DEFAULT '';
ALTER TABLE header_icon_settings ADD COLUMN color_hover TEXT NOT NULL DEFAULT '';

-- Header menu settings + nested items (up to 3 levels)
CREATE TABLE IF NOT EXISTS header_menu_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  more INTEGER NOT NULL DEFAULT 0,
  max_width TEXT NOT NULL DEFAULT '400',
  color TEXT NOT NULL DEFAULT '',
  color_hover TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO header_menu_settings (id, more, max_width, color, color_hover)
VALUES (1, 0, '400', '', '');

CREATE TABLE IF NOT EXISTS header_menu_items (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
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

CREATE INDEX IF NOT EXISTS idx_header_menu_items_parent ON header_menu_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_header_menu_items_position ON header_menu_items(position);
