CREATE TABLE IF NOT EXISTS article_categories (
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

CREATE INDEX IF NOT EXISTS idx_article_categories_position ON article_categories(position);

CREATE TABLE IF NOT EXISTS article_subcategories (
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

CREATE INDEX IF NOT EXISTS idx_article_subcategories_category ON article_subcategories(category_id, position);

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL DEFAULT 1,
  slug TEXT NOT NULL UNIQUE,
  title_ro TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL DEFAULT '',
  title_bg TEXT NOT NULL DEFAULT '',
  category_id TEXT,
  subcategory_id TEXT,
  published_at TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_articles_position ON articles(position);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id, position);

CREATE TABLE IF NOT EXISTS article_pages (
  article_id TEXT PRIMARY KEY,
  body_html_ro TEXT NOT NULL DEFAULT '',
  body_html_en TEXT NOT NULL DEFAULT '',
  body_html_bg TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
