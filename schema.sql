-- FACILI-TA MED · Cloudflare D1
-- Execute once in the D1 database attached to the production Worker.

CREATE TABLE IF NOT EXISTS doctors (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  doctor_name TEXT NOT NULL DEFAULT '',
  crm TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  cpf TEXT NOT NULL DEFAULT '',
  specialty TEXT NOT NULL DEFAULT '',
  clinic_address TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS sessions_doctor_id_idx ON sessions(doctor_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS prescriptions (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_birth TEXT NOT NULL DEFAULT '',
  issued_at TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS prescriptions_doctor_date_idx
  ON prescriptions(doctor_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS prescriptions_doctor_patient_idx
  ON prescriptions(doctor_id, patient_name);

CREATE TABLE IF NOT EXISTS auth_attempts (
  email TEXT PRIMARY KEY COLLATE NOCASE,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_started INTEGER NOT NULL
);
