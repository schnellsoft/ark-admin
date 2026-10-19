import { DEFAULT_AI_SETTINGS_JSON } from "./ai-defaults";
import { getEnv } from "./env";

/** Bump when additive migrations must re-run on already-booted local DBs. */
const SCHEMA_EPOCH = 18;
let schemaReadyEpoch = 0;
/** Serialize bootstrap — concurrent first requests otherwise race on table rebuilds. */
let schemaInflight: Promise<void> | null = null;

const USERS_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'patient', 'doctor')),
  name TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  phone TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 1,
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

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  doctor_id TEXT,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'postponed', 'canceled', 'no_show')),
  ticket_id TEXT,
  subject TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS patient_push_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_appointments_starts ON appointments(starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status, starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id, starts_at);
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
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'waiting_on_patient', 'resolved')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  assignee_id TEXT,
  patient_user_id TEXT,
  appointment_id TEXT,
  ticket_number INTEGER NOT NULL DEFAULT 0,
  from_name TEXT,
  from_email TEXT,
  from_phone TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'website',
  due_at TEXT,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  author_user_id TEXT,
  author_name TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL CHECK (kind IN ('patient', 'staff', 'internal')),
  body TEXT NOT NULL,
  staff_read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_unread ON ticket_messages(staff_read_at);

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

CREATE TABLE IF NOT EXISTS footer_icons (
  id TEXT PRIMARY KEY,
  icon_id TEXT,
  name TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL DEFAULT '',
  aria_label TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '#',
  position INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_footer_icons_position ON footer_icons(position);

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
  max_bytes INTEGER NOT NULL DEFAULT 26214400,
  max_video_bytes INTEGER NOT NULL DEFAULT 83886080,
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
  kind TEXT NOT NULL DEFAULT 'image',
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

CREATE TABLE IF NOT EXISTS slideshow_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  animation TEXT NOT NULL DEFAULT 'fade',
  autoplay INTEGER NOT NULL DEFAULT 1,
  autoplay_interval INTEGER NOT NULL DEFAULT 7000,
  animation_duration INTEGER NOT NULL DEFAULT 780,
  kenburns INTEGER NOT NULL DEFAULT 1,
  finite INTEGER NOT NULL DEFAULT 0,
  pause_on_hover INTEGER NOT NULL DEFAULT 1,
  velocity REAL NOT NULL DEFAULT 1,
  swipe_threshold INTEGER NOT NULL DEFAULT 48,
  ratio TEXT NOT NULL DEFAULT '16:9',
  min_height TEXT NOT NULL DEFAULT '',
  max_height TEXT NOT NULL DEFAULT '',
  idx INTEGER NOT NULL DEFAULT 0,
  output_json TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS slideshow_slides (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL DEFAULT '',
  alt TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  media_kind TEXT NOT NULL DEFAULT 'image',
  version TEXT NOT NULL DEFAULT '',
  mobile_crop_json TEXT NOT NULL DEFAULT '',
  desktop_crop_json TEXT NOT NULL DEFAULT '',
  desktop_focus_json TEXT NOT NULL DEFAULT '',
  filters_json TEXT NOT NULL DEFAULT '',
  files_json TEXT NOT NULL DEFAULT '{}',
  layer_json TEXT NOT NULL DEFAULT '',
  library_asset_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_slideshow_slides_position ON slideshow_slides(position);

CREATE TABLE IF NOT EXISTS galleries (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL DEFAULT 1,
  slug TEXT NOT NULL UNIQUE,
  name_ro TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  name_bg TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  settings_json TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_galleries_position ON galleries(position);

CREATE TABLE IF NOT EXISTS gallery_slides (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL DEFAULT '',
  alt TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  media_kind TEXT NOT NULL DEFAULT 'image',
  version TEXT NOT NULL DEFAULT '',
  mobile_crop_json TEXT NOT NULL DEFAULT '',
  desktop_crop_json TEXT NOT NULL DEFAULT '',
  desktop_focus_json TEXT NOT NULL DEFAULT '',
  filters_json TEXT NOT NULL DEFAULT '',
  files_json TEXT NOT NULL DEFAULT '{}',
  layer_json TEXT NOT NULL DEFAULT '',
  library_asset_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gallery_slides_gallery_position
  ON gallery_slides(gallery_id, position);
`;

const SERVICES_SCHEMA = `
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

CREATE INDEX IF NOT EXISTS idx_service_subcategories_category ON service_subcategories(category_id, position);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL DEFAULT 1,
  slug TEXT NOT NULL UNIQUE,
  title_ro TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL DEFAULT '',
  title_bg TEXT NOT NULL DEFAULT '',
  category_id TEXT NOT NULL,
  subcategory_id TEXT,
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

CREATE TABLE IF NOT EXISTS service_recommended (
  service_id TEXT PRIMARY KEY,
  position INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_service_recommended_position ON service_recommended(position);

CREATE TABLE IF NOT EXISTS service_pages (
  service_id TEXT PRIMARY KEY,
  synopsis_ro TEXT NOT NULL DEFAULT '',
  synopsis_en TEXT NOT NULL DEFAULT '',
  synopsis_bg TEXT NOT NULL DEFAULT '',
  body_json_ro TEXT NOT NULL DEFAULT '[]',
  body_json_en TEXT NOT NULL DEFAULT '[]',
  body_json_bg TEXT NOT NULL DEFAULT '[]',
  images_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const STUFF_SCHEMA = `
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

CREATE TABLE IF NOT EXISTS stuff_roles (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL DEFAULT 1,
  name_ro TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  name_bg TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stuff_roles_position ON stuff_roles(position);

CREATE TABLE IF NOT EXISTS stuff_specialties (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL DEFAULT 1,
  name_ro TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  name_bg TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stuff_specialties_position ON stuff_specialties(position);

CREATE TABLE IF NOT EXISTS stuff_provided_services (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL DEFAULT 1,
  name_ro TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  name_bg TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stuff_provided_services_position ON stuff_provided_services(position);

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
  specialty_ro TEXT NOT NULL DEFAULT '',
  specialty_en TEXT NOT NULL DEFAULT '',
  specialty_bg TEXT NOT NULL DEFAULT '',
  role_id TEXT,
  specialty_id TEXT,
  doctor_title INTEGER NOT NULL DEFAULT 0,
  college TEXT NOT NULL DEFAULT '',
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

CREATE TABLE IF NOT EXISTS stuff_member_provided_services (
  member_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (member_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_stuff_member_provided_services_member
  ON stuff_member_provided_services(member_id, position);

CREATE TABLE IF NOT EXISTS stuff_spotlight_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  autoplay INTEGER NOT NULL DEFAULT 1,
  delay_ms INTEGER NOT NULL DEFAULT 3000,
  stop_on_hover INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const SCHEDULE_LOCATION_SCHEMA = `
CREATE TABLE IF NOT EXISTS schedule_days (
  day INTEGER PRIMARY KEY CHECK (day BETWEEN 1 AND 7),
  open_time TEXT NOT NULL DEFAULT '',
  close_time TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS location_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  latitude TEXT NOT NULL DEFAULT '',
  longitude TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  google_maps_key TEXT NOT NULL DEFAULT '',
  building_library_id TEXT,
  building_master_key TEXT NOT NULL DEFAULT '',
  building_webp_key TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contact_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const ARTICLES_SCHEMA = `
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
  snippet_title_ro TEXT NOT NULL DEFAULT '',
  snippet_title_en TEXT NOT NULL DEFAULT '',
  snippet_title_bg TEXT NOT NULL DEFAULT '',
  snippet_text_ro TEXT NOT NULL DEFAULT '',
  snippet_text_en TEXT NOT NULL DEFAULT '',
  snippet_text_bg TEXT NOT NULL DEFAULT '',
  snippet_date TEXT NOT NULL DEFAULT '',
  snippet_library_id TEXT,
  snippet_master_key TEXT NOT NULL DEFAULT '',
  snippet_webp_key TEXT,
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

CREATE TABLE IF NOT EXISTS article_first_page (
  article_id TEXT PRIMARY KEY,
  position INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_article_first_page_position ON article_first_page(position);
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
    try {
      await db.prepare(statement).run();
    } catch (error) {
      // Existing local DBs may lack columns referenced by new indexes until migrate* runs.
      const msg = error instanceof Error ? error.message : String(error);
      if (/no such column/i.test(msg) && /^CREATE INDEX/i.test(statement)) {
        continue;
      }
      throw error;
    }
  }
}

export async function ensureSchema() {
  if (schemaReadyEpoch === SCHEMA_EPOCH) return;
  if (schemaInflight) {
    await schemaInflight;
    return;
  }
  schemaInflight = runEnsureSchema().finally(() => {
    schemaInflight = null;
  });
  await schemaInflight;
}

async function runEnsureSchema() {
  if (schemaReadyEpoch === SCHEMA_EPOCH) return;
  const { DB, SITE_DB } = getEnv();

  // Clear leftover rebuild tables from interrupted prior boots.
  await DB.prepare(`DROP TABLE IF EXISTS users__crm_mig`).run();
  await SITE_DB.prepare(`DROP TABLE IF EXISTS tickets__crm_mig`).run();

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
      ('locale', '{"default":"en","supported":["en","ro"]}'),
      ('site', '{"domain":"","adminApiUrl":""}')`,
  )
    .bind(DEFAULT_AI_SETTINGS_JSON)
    .run();

  await SITE_DB.prepare(
    `INSERT OR IGNORE INTO site_settings (key, value_json) VALUES
      ('site', '{"domain":"","adminApiUrl":""}')`,
  ).run();

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

  // Existing local DBs were created before these columns — alter before any INSERT/SELECT that uses them.
  await tryAlter(
    SITE_DB,
    `ALTER TABLE library_settings ADD COLUMN max_video_bytes INTEGER NOT NULL DEFAULT 83886080`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE library_images ADD COLUMN alt TEXT NOT NULL DEFAULT ''`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE library_images ADD COLUMN kind TEXT NOT NULL DEFAULT 'image'`,
  );

  await SITE_DB.prepare(
    `INSERT OR IGNORE INTO library_settings (
       id, max_width, convert_to_webp, jpeg_quality, webp_quality, max_bytes, max_video_bytes, max_files_per_batch
     ) VALUES (1, 1920, 1, 0.85, 0.82, 26214400, 83886080, 20)`,
  ).run();
  // Bump legacy 15 MB default to 25 MB without overwriting custom limits.
  await SITE_DB.prepare(
    `UPDATE library_settings SET max_bytes = 26214400, updated_at = datetime('now')
     WHERE id = 1 AND max_bytes = 15728640`,
  ).run();

  await SITE_DB.prepare(
    `INSERT OR IGNORE INTO library_categories (id, name, position, is_system)
     VALUES ('unspecified', 'Unspecified', 1, 1)`,
  ).run();

  await tryAlter(
    SITE_DB,
    `ALTER TABLE slideshow_settings ADD COLUMN animation_duration INTEGER NOT NULL DEFAULT 780`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE slideshow_settings ADD COLUMN kenburns INTEGER NOT NULL DEFAULT 1`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE slideshow_settings ADD COLUMN swipe_threshold INTEGER NOT NULL DEFAULT 48`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE slideshow_settings ADD COLUMN output_json TEXT NOT NULL DEFAULT ''`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE slideshow_slides ADD COLUMN title TEXT NOT NULL DEFAULT ''`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE slideshow_slides ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE slideshow_slides ADD COLUMN filters_json TEXT NOT NULL DEFAULT ''`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE slideshow_slides ADD COLUMN desktop_crop_json TEXT NOT NULL DEFAULT ''`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE slideshow_slides ADD COLUMN desktop_focus_json TEXT NOT NULL DEFAULT ''`,
  );

  await SITE_DB.prepare(
    `INSERT OR IGNORE INTO slideshow_settings (id) VALUES (1)`,
  ).run();

  await runStatements(SITE_DB, SERVICES_SCHEMA);
  await runStatements(SITE_DB, STUFF_SCHEMA);
  await runStatements(SITE_DB, SCHEDULE_LOCATION_SCHEMA);
  await runStatements(SITE_DB, ARTICLES_SCHEMA);

  for (const day of [1, 2, 3, 4, 5, 6, 7]) {
    await SITE_DB.prepare(
      `INSERT OR IGNORE INTO schedule_days (day, open_time, close_time) VALUES (?, '', '')`,
    )
      .bind(day)
      .run();
  }
  await SITE_DB.prepare(
    `INSERT OR IGNORE INTO location_settings (id) VALUES (1)`,
  ).run();
  await SITE_DB.prepare(
    `INSERT OR IGNORE INTO contact_settings (id) VALUES (1)`,
  ).run();
  await tryAlter(
    SITE_DB,
    `ALTER TABLE location_settings ADD COLUMN address TEXT NOT NULL DEFAULT ''`,
  );

  await tryAlter(
    SITE_DB,
    `ALTER TABLE library_images ADD COLUMN portrait_800_key TEXT`,
  );

  // Existing local DBs may have been created before these article columns existed.
  await tryAlter(
    SITE_DB,
    `ALTER TABLE articles ADD COLUMN published_at TEXT NOT NULL DEFAULT ''`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE articles ADD COLUMN category_id TEXT`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE articles ADD COLUMN subcategory_id TEXT`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE articles ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE articles ADD COLUMN snippet_title_ro TEXT NOT NULL DEFAULT ''`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE articles ADD COLUMN snippet_title_en TEXT NOT NULL DEFAULT ''`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE articles ADD COLUMN snippet_title_bg TEXT NOT NULL DEFAULT ''`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE articles ADD COLUMN snippet_text_ro TEXT NOT NULL DEFAULT ''`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE articles ADD COLUMN snippet_text_en TEXT NOT NULL DEFAULT ''`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE articles ADD COLUMN snippet_text_bg TEXT NOT NULL DEFAULT ''`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE articles ADD COLUMN snippet_date TEXT NOT NULL DEFAULT ''`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE articles ADD COLUMN snippet_library_id TEXT`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE articles ADD COLUMN snippet_master_key TEXT NOT NULL DEFAULT ''`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE articles ADD COLUMN snippet_webp_key TEXT`,
  );

  await tryAlter(
    SITE_DB,
    `ALTER TABLE stuff_members ADD COLUMN specialty_ro TEXT NOT NULL DEFAULT ''`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE stuff_members ADD COLUMN specialty_en TEXT NOT NULL DEFAULT ''`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE stuff_members ADD COLUMN specialty_bg TEXT NOT NULL DEFAULT ''`,
  );
  await tryAlter(SITE_DB, `ALTER TABLE stuff_members ADD COLUMN role_id TEXT`);
  await tryAlter(
    SITE_DB,
    `ALTER TABLE stuff_members ADD COLUMN specialty_id TEXT`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE stuff_members ADD COLUMN doctor_title INTEGER NOT NULL DEFAULT 0`,
  );
  await tryAlter(
    SITE_DB,
    `ALTER TABLE stuff_members ADD COLUMN college TEXT NOT NULL DEFAULT ''`,
  );

  // Drop slug (and its UNIQUE index) from named catalogs by rebuild.
  for (const table of [
    "stuff_roles",
    "stuff_specialties",
    "stuff_provided_services",
  ] as const) {
    await rebuildStuffNamedCatalogWithoutSlug(SITE_DB, table);
  }

  await SITE_DB.prepare(
    `INSERT OR IGNORE INTO stuff_spotlight_settings
       (id, autoplay, delay_ms, stop_on_hover)
     VALUES (1, 1, 3000, 1)`,
  ).run();

  await migrateUsersCrm(DB);
  await migrateTicketsCrm(SITE_DB);

  schemaReadyEpoch = SCHEMA_EPOCH;
}

/** Additive CRM columns + widen role CHECK (rebuild when needed). */
async function migrateUsersCrm(db: D1Database) {
  await tryAlter(db, `ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT ''`);
  await tryAlter(db, `ALTER TABLE users ADD COLUMN notes TEXT NOT NULL DEFAULT ''`);
  await tryAlter(db, `ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1`);
  await tryAlter(db, `ALTER TABLE users ADD COLUMN position INTEGER NOT NULL DEFAULT 1`);

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        doctor_id TEXT,
        starts_at TEXT NOT NULL,
        ends_at TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'scheduled'
          CHECK (status IN ('scheduled', 'in_progress', 'completed', 'postponed', 'canceled', 'no_show')),
        ticket_id TEXT,
        subject TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_by TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    )
    .run();
  await db
    .prepare(`CREATE INDEX IF NOT EXISTS idx_appointments_starts ON appointments(starts_at)`)
    .run();
  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id, starts_at)`,
    )
    .run();
  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status, starts_at)`,
    )
    .run();
  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id, starts_at)`,
    )
    .run();
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS patient_push_tokens (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    )
    .run();
  await db
    .prepare(`CREATE INDEX IF NOT EXISTS idx_users_role_position ON users(role, position)`)
    .run();

  // Widen role CHECK to include doctor when an old table definition is still in place.
  try {
    await db
      .prepare(
        `INSERT INTO users (id, email, password_hash, role, name, locale)
         VALUES ('__role_probe__', '__role_probe__@ark.invalid', NULL, 'doctor', 'probe', 'en')`,
      )
      .run();
    await db.prepare(`DELETE FROM users WHERE id = '__role_probe__'`).run();
  } catch {
    await rebuildUsersWithDoctorRole(db);
  }
}

async function rebuildUsersWithDoctorRole(db: D1Database) {
  const tmp = `users__crm_mig_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  await db.prepare(`DROP TABLE IF EXISTS users__crm_mig`).run();
  await db
    .prepare(
      `CREATE TABLE ${tmp} (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'patient', 'doctor')),
        name TEXT NOT NULL,
        locale TEXT NOT NULL DEFAULT 'en',
        phone TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1,
        position INTEGER NOT NULL DEFAULT 1,
        lat REAL,
        lng REAL,
        geo_updated_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    )
    .run();
  await db
    .prepare(
      `INSERT INTO ${tmp} (
         id, email, password_hash, role, name, locale, phone, notes, active, position,
         lat, lng, geo_updated_at, created_at
       )
       SELECT id, email, password_hash, role, name, locale,
              COALESCE(phone, ''), COALESCE(notes, ''), COALESCE(active, 1), COALESCE(position, 1),
              lat, lng, geo_updated_at, created_at
       FROM users`,
    )
    .run();
  await db.prepare(`DROP TABLE users`).run();
  await db.prepare(`ALTER TABLE ${tmp} RENAME TO users`).run();
}

async function migrateTicketsCrm(db: D1Database) {
  await tryAlter(db, `ALTER TABLE tickets ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal'`);
  await tryAlter(db, `ALTER TABLE tickets ADD COLUMN patient_user_id TEXT`);
  await tryAlter(db, `ALTER TABLE tickets ADD COLUMN appointment_id TEXT`);
  await tryAlter(db, `ALTER TABLE tickets ADD COLUMN ticket_number INTEGER NOT NULL DEFAULT 0`);
  await tryAlter(db, `ALTER TABLE tickets ADD COLUMN from_phone TEXT NOT NULL DEFAULT ''`);
  await tryAlter(db, `ALTER TABLE tickets ADD COLUMN source TEXT NOT NULL DEFAULT 'website'`);
  await tryAlter(db, `ALTER TABLE tickets ADD COLUMN due_at TEXT`);

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS ticket_messages (
        id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL,
        author_user_id TEXT,
        author_name TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL CHECK (kind IN ('patient', 'staff', 'internal')),
        body TEXT NOT NULL,
        staff_read_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    )
    .run();
  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id, created_at)`,
    )
    .run();
  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_ticket_messages_unread ON ticket_messages(staff_read_at)`,
    )
    .run();
  await db
    .prepare(`CREATE INDEX IF NOT EXISTS idx_tickets_number ON tickets(ticket_number)`)
    .run();

  // Migrate legacy statuses if old CHECK still allows them; then rebuild for new CHECK.
  try {
    await db.prepare(`UPDATE tickets SET status = 'new' WHERE status = 'open'`).run();
    await db.prepare(`UPDATE tickets SET status = 'resolved' WHERE status = 'closed'`).run();
  } catch {
    // ignore
  }

  try {
    await db
      .prepare(
        `INSERT INTO tickets (id, subject, status, body)
         VALUES ('__status_probe__', 'probe', 'waiting_on_patient', 'probe')`,
      )
      .run();
    await db.prepare(`DELETE FROM tickets WHERE id = '__status_probe__'`).run();
  } catch {
    await rebuildTicketsStatuses(db);
  }

  await db
    .prepare(
      `UPDATE tickets
       SET ticket_number = (
         SELECT COUNT(*) FROM tickets t2
         WHERE t2.created_at < tickets.created_at
            OR (t2.created_at = tickets.created_at AND t2.id <= tickets.id)
       )
       WHERE ticket_number = 0 OR ticket_number IS NULL`,
    )
    .run();

  // Seed thread from body for tickets that have no messages yet.
  const orphans = await db
    .prepare(
      `SELECT t.id, t.from_name, t.body, t.created_at
       FROM tickets t
       WHERE NOT EXISTS (SELECT 1 FROM ticket_messages m WHERE m.ticket_id = t.id)`,
    )
    .all<{ id: string; from_name: string | null; body: string; created_at: string }>();
  for (const row of orphans.results ?? []) {
    await db
      .prepare(
        `INSERT INTO ticket_messages (id, ticket_id, author_name, kind, body, staff_read_at, created_at)
         VALUES (?, ?, ?, 'patient', ?, NULL, ?)`,
      )
      .bind(crypto.randomUUID(), row.id, row.from_name ?? "", row.body, row.created_at)
      .run();
  }
}

async function rebuildTicketsStatuses(db: D1Database) {
  const tmp = `tickets__crm_mig_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  await db.prepare(`DROP TABLE IF EXISTS tickets__crm_mig`).run();
  await db
    .prepare(
      `CREATE TABLE ${tmp} (
        id TEXT PRIMARY KEY,
        subject TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new'
          CHECK (status IN ('new', 'in_progress', 'waiting_on_patient', 'resolved')),
        priority TEXT NOT NULL DEFAULT 'normal'
          CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
        assignee_id TEXT,
        patient_user_id TEXT,
        appointment_id TEXT,
        ticket_number INTEGER NOT NULL DEFAULT 0,
        from_name TEXT,
        from_email TEXT,
        from_phone TEXT NOT NULL DEFAULT '',
        source TEXT NOT NULL DEFAULT 'website',
        due_at TEXT,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    )
    .run();
  await db
    .prepare(
      `INSERT INTO ${tmp} (
         id, subject, status, priority, assignee_id, patient_user_id, appointment_id,
         ticket_number, from_name, from_email, from_phone, source, due_at, body,
         created_at, updated_at
       )
       SELECT id, subject,
         CASE status
           WHEN 'open' THEN 'new'
           WHEN 'closed' THEN 'resolved'
           WHEN 'new' THEN 'new'
           WHEN 'in_progress' THEN 'in_progress'
           WHEN 'waiting_on_patient' THEN 'waiting_on_patient'
           WHEN 'resolved' THEN 'resolved'
           ELSE 'new'
         END,
         CASE
           WHEN priority IN ('urgent', 'high', 'normal', 'low') THEN priority
           ELSE 'normal'
         END,
         assignee_id, patient_user_id, appointment_id,
         COALESCE(ticket_number, 0), from_name, from_email,
         COALESCE(from_phone, ''), COALESCE(source, 'website'), due_at, body,
         created_at, updated_at
       FROM tickets`,
    )
    .run();
  await db.prepare(`DROP TABLE tickets`).run();
  await db.prepare(`ALTER TABLE ${tmp} RENAME TO tickets`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_tickets_number ON tickets(ticket_number)`).run();
}

async function rebuildStuffNamedCatalogWithoutSlug(
  db: D1Database,
  table:
    | "stuff_roles"
    | "stuff_specialties"
    | "stuff_provided_services",
) {
  const { results } = await db.prepare(`PRAGMA table_info(${table})`).all<{
    name: string;
  }>();
  const cols = new Set((results ?? []).map((r) => r.name));
  if (!cols.has("slug")) return;

  const tmp = `${table}__no_slug`;
  await db.prepare(`DROP TABLE IF EXISTS ${tmp}`).run();
  await db
    .prepare(
      `CREATE TABLE ${tmp} (
        id TEXT PRIMARY KEY,
        position INTEGER NOT NULL DEFAULT 1,
        name_ro TEXT NOT NULL DEFAULT '',
        name_en TEXT NOT NULL DEFAULT '',
        name_bg TEXT NOT NULL DEFAULT '',
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    )
    .run();
  await db
    .prepare(
      `INSERT INTO ${tmp}
         (id, position, name_ro, name_en, name_bg, enabled, created_at, updated_at)
       SELECT id, position, name_ro, name_en, name_bg, enabled, created_at, updated_at
       FROM ${table}`,
    )
    .run();
  await db.prepare(`DROP TABLE ${table}`).run();
  await db.prepare(`ALTER TABLE ${tmp} RENAME TO ${table}`).run();
  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_${table}_position ON ${table}(position)`,
    )
    .run();
}
