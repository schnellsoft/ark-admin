-- Staff (Stuff) categories, subcategories, and members

CREATE TABLE IF NOT EXISTS stuff_categories (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL DEFAULT 1,
  slug TEXT NOT NULL UNIQUE,
  name_ro TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  name_bg TEXT NOT NULL DEFAULT '',
  icon_key TEXT NOT NULL DEFAULT '',
  icon_svg TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stuff_categories_position ON stuff_categories(position);

CREATE TABLE IF NOT EXISTS stuff_subcategories (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 1,
  slug TEXT NOT NULL,
  name_ro TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  name_bg TEXT NOT NULL DEFAULT '',
  icon_svg TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stuff_subcategories_category ON stuff_subcategories(category_id, position);

CREATE TABLE IF NOT EXISTS stuff_members (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL DEFAULT 1,
  slug TEXT NOT NULL UNIQUE,
  name_ro TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  name_bg TEXT NOT NULL DEFAULT '',
  role_ro TEXT NOT NULL DEFAULT '',
  role_en TEXT NOT NULL DEFAULT '',
  role_bg TEXT NOT NULL DEFAULT '',
  snippet_ro TEXT NOT NULL DEFAULT '',
  snippet_en TEXT NOT NULL DEFAULT '',
  snippet_bg TEXT NOT NULL DEFAULT '',
  category_id TEXT NOT NULL,
  subcategory_id TEXT,
  portrait_library_id TEXT,
  portrait_master_key TEXT NOT NULL DEFAULT '',
  portrait_webp_key TEXT,
  portrait_800_key TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stuff_members_position ON stuff_members(position);
CREATE INDEX IF NOT EXISTS idx_stuff_members_category ON stuff_members(category_id, position);
