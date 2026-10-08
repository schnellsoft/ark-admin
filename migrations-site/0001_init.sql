-- ark-admin-db-site: content + public-site data (no users table; DBs do not join).
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

INSERT OR IGNORE INTO content_drafts (key, payload_json) VALUES
  ('slideshow', '{"slides":[{"id":"1","title":"Welcome to Ark Dental","html":"<p>Smile with confidence.</p>","mediaKey":null,"mediaType":"image","order":0}]}'),
  ('home', '{"headline":"Ark Dental Clinic","subhead":"Modern care for every smile","blocks":[]}'),
  ('seo', '{"title":"Ark Dental Clinic","description":"Family dental care","ogImage":"","robots":"index,follow","canonical":"","jsonLd":"{}"}');

INSERT OR IGNORE INTO site_settings (key, value_json) VALUES
  ('ai', '{"endpoint":"https://api.openai.com/v1","model":"gpt-4o-mini","apiKey":""}'),
  ('email', '{"to":"admin@ark.local","from":"noreply@ark.local","resendApiKey":""}'),
  ('locale', '{"default":"en","supported":["en","ro"]}');
