-- Media library: settings, categories, images, many-to-many junctions

CREATE TABLE IF NOT EXISTS library_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  max_width INTEGER NOT NULL DEFAULT 1920,
  convert_to_webp INTEGER NOT NULL DEFAULT 1,
  jpeg_quality REAL NOT NULL DEFAULT 0.85,
  webp_quality REAL NOT NULL DEFAULT 0.82,
  max_bytes INTEGER NOT NULL DEFAULT 15728640,
  max_files_per_batch INTEGER NOT NULL DEFAULT 20,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO library_settings (
  id, max_width, convert_to_webp, jpeg_quality, webp_quality, max_bytes, max_files_per_batch
) VALUES (1, 1920, 1, 0.85, 0.82, 15728640, 20);

CREATE TABLE IF NOT EXISTS library_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  position INTEGER NOT NULL DEFAULT 1,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_library_categories_name ON library_categories(name);
CREATE INDEX IF NOT EXISTS idx_library_categories_position ON library_categories(position);

INSERT OR IGNORE INTO library_categories (id, name, position, is_system)
VALUES ('unspecified', 'Unspecified', 1, 1);

CREATE TABLE IF NOT EXISTS library_images (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  master_key TEXT NOT NULL,
  master_content_type TEXT NOT NULL DEFAULT 'image/jpeg',
  webp_key TEXT,
  width INTEGER NOT NULL DEFAULT 0,
  height INTEGER NOT NULL DEFAULT 0,
  bytes INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_library_images_name ON library_images(name);
CREATE INDEX IF NOT EXISTS idx_library_images_position ON library_images(position);

CREATE TABLE IF NOT EXISTS library_image_categories (
  image_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  PRIMARY KEY (image_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_library_image_categories_category
  ON library_image_categories(category_id);
