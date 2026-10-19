-- ark-admin-db: users + CRM (auth / patients / doctors / appointments). No site content.
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
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_users_role_position ON users(role, position);
