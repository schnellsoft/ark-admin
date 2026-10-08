-- SVG icon library for the static site (dbsite)
CREATE TABLE IF NOT EXISTS icons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  svg TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_icons_name ON icons(name);
CREATE INDEX IF NOT EXISTS idx_icons_position ON icons(position);
