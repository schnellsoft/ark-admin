import { DEFAULT_AI_SETTINGS_JSON } from "./ai-defaults";
import { getEnv } from "./env";

let ready = false;

const USERS_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'patient')),
  name TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  lat REAL,
  lng REAL,
  geo_updated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
`;

const SITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('contact', 'chat', 'system', 'ticket')),
  from_user_id TEXT,
  from_name TEXT,
  from_email TEXT,
  body TEXT NOT NULL,
  meta_json TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  assignee_id TEXT,
  from_name TEXT,
  from_email TEXT,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS content_drafts (
  key TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS publish_log (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  r2_prefix TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS geo_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(read_at);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

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

CREATE TABLE IF NOT EXISTS header_icon_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  more INTEGER NOT NULL DEFAULT 0,
  max_width TEXT NOT NULL DEFAULT '200',
  color TEXT NOT NULL DEFAULT '',
  color_hover TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS header_menu_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  more INTEGER NOT NULL DEFAULT 0,
  max_width TEXT NOT NULL DEFAULT '400',
  color TEXT NOT NULL DEFAULT '',
  color_hover TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS library_images (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  alt TEXT NOT NULL DEFAULT '',
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
`;

async function tryAlter(db: D1Database, sql: string) {
  try {
    await db.prepare(sql).run();
  } catch {
    // column already exists
  }
}

async function runStatements(db: D1Database, sql: string) {
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await db.prepare(statement).run();
  }
}

export async function ensureSchema() {
  if (ready) return;
  const { DB, SITE_DB } = getEnv();

  await runStatements(DB, USERS_SCHEMA);
  await runStatements(SITE_DB, SITE_SCHEMA);

  for (const table of [
    "geo_events",
    "push_subscriptions",
    "site_settings",
    "publish_log",
    "content_drafts",
    "tickets",
    "messages",
  ]) {
    await DB.prepare(`DROP TABLE IF EXISTS ${table}`).run();
  }

  await SITE_DB.prepare(
    `INSERT OR IGNORE INTO content_drafts (key, payload_json) VALUES
      ('slideshow', '{"slides":[{"id":"1","title":"Welcome to Ark Dental","html":"<p>Smile with confidence.</p>","mediaKey":null,"mediaType":"image","order":0}]}'),
      ('home', '{"headline":"Ark Dental Clinic","subhead":"Modern care for every smile","blocks":[]}'),
      ('seo', '{"title":"Ark Dental Clinic","description":"Family dental care","ogImage":"","robots":"index,follow","canonical":"","jsonLd":"{}"}')`,
  ).run();

  await SITE_DB.prepare(
    `INSERT OR IGNORE INTO site_settings (key, value_json) VALUES
      ('ai', ?),
      ('email', '{"to":"admin@ark.local","from":"noreply@ark.local","resendApiKey":""}'),
      ('locale', '{"default":"en","supported":["en","ro"]}')`,
  )
    .bind(DEFAULT_AI_SETTINGS_JSON)
    .run();

  // Migrate empty seed defaults (OpenAI or old CF chat defaults) to CF translation model.
  await SITE_DB.prepare(
    `UPDATE site_settings
     SET value_json = ?, updated_at = datetime('now')
     WHERE key = 'ai'
       AND value_json LIKE '%"apiKey":""%'
       AND (
         value_json LIKE '%api.openai.com%'
         OR value_json LIKE '%gpt-4o-mini%'
         OR value_json LIKE '%llama-3.1-8b-instruct%'
         OR value_json LIKE '%/ai/v1"%'
       )`,
  )
    .bind(DEFAULT_AI_SETTINGS_JSON)
    .run();

  await tryAlter(
    SITE_DB,
    `ALTER TABLE header_icon_settings ADD COLUMN color TEXT NOT NULL DEFAULT ''`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE header_icon_settings ADD COLUMN color_hover TEXT NOT NULL DEFAULT ''`,
  );

  await SITE_DB.prepare(
    `INSERT OR IGNORE INTO header_icon_settings (id, more, max_width, color, color_hover)
     VALUES (1, 0, '200', '', '')`,
  ).run();

  await SITE_DB.prepare(
    `INSERT OR IGNORE INTO header_menu_settings (id, more, max_width, color, color_hover)
     VALUES (1, 0, '400', '', '')`,
  ).run();

  await SITE_DB.prepare(
    `INSERT OR IGNORE INTO library_settings (
       id, max_width, convert_to_webp, jpeg_quality, webp_quality, max_bytes, max_files_per_batch
     ) VALUES (1, 1920, 1, 0.85, 0.82, 15728640, 20)`,
  ).run();

  await SITE_DB.prepare(
    `INSERT OR IGNORE INTO library_categories (id, name, position, is_system)
     VALUES ('unspecified', 'Unspecified', 1, 1)`,
  ).run();

  await tryAlter(
    SITE_DB,
    `ALTER TABLE library_images ADD COLUMN alt TEXT NOT NULL DEFAULT ''`,
  );

  ready = true;
}
