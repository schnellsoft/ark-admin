-- Services CMS: categories, subcategories, services, recommended order, pages

CREATE TABLE IF NOT EXISTS service_categories (
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

CREATE INDEX IF NOT EXISTS idx_service_categories_position ON service_categories(position);

CREATE TABLE IF NOT EXISTS service_subcategories (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  slug TEXT NOT NULL,
  name_ro TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  name_bg TEXT NOT NULL DEFAULT '',
  icon_svg TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (category_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_service_subcategories_category ON service_subcategories(category_id, position);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL DEFAULT 1,
  slug TEXT NOT NULL UNIQUE,
  title_ro TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL DEFAULT '',
  title_bg TEXT NOT NULL DEFAULT '',
  category_id TEXT NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
  subcategory_id TEXT REFERENCES service_subcategories(id) ON DELETE SET NULL,
  icon_id TEXT,
  icon_svg TEXT NOT NULL DEFAULT '',
  price_text TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'RON',
  page_path TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_services_position ON services(position);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id, position);
CREATE INDEX IF NOT EXISTS idx_services_subcategory ON services(subcategory_id);

CREATE TABLE IF NOT EXISTS service_recommended (
  service_id TEXT PRIMARY KEY REFERENCES services(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_service_recommended_position ON service_recommended(position);

CREATE TABLE IF NOT EXISTS service_pages (
  service_id TEXT PRIMARY KEY REFERENCES services(id) ON DELETE CASCADE,
  synopsis_ro TEXT NOT NULL DEFAULT '',
  synopsis_en TEXT NOT NULL DEFAULT '',
  synopsis_bg TEXT NOT NULL DEFAULT '',
  body_json_ro TEXT NOT NULL DEFAULT '[]',
  body_json_en TEXT NOT NULL DEFAULT '[]',
  body_json_bg TEXT NOT NULL DEFAULT '[]',
  images_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
