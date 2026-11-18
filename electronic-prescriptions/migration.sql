-- FACILI-TA MED · base isolada para receitas eletrônicas
-- NÃO executar em produção ainda. Aplicar somente após revisão e aprovação da integração.
-- Nenhuma chave privada, senha ou token de certificado deve ser armazenado nestas tabelas.

CREATE TABLE IF NOT EXISTS doctor_electronic_settings (
  doctor_id TEXT PRIMARY KEY REFERENCES doctors(id) ON DELETE CASCADE,
  signature_method TEXT NOT NULL DEFAULT 'icp_brasil',
  certificate_subject TEXT NOT NULL DEFAULT '',
  certificate_serial TEXT NOT NULL DEFAULT '',
  certificate_fingerprint TEXT NOT NULL DEFAULT '',
  certificate_valid_until TEXT NOT NULL DEFAULT '',
  certificate_status TEXT NOT NULL DEFAULT 'not_configured',
  sncr_status TEXT NOT NULL DEFAULT 'not_connected',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS electronic_prescriptions (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  prescription_type TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  patient_birth TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  sncr_number TEXT NOT NULL DEFAULT '',
  sncr_reference TEXT NOT NULL DEFAULT '',
  payload TEXT NOT NULL,
  document_key TEXT NOT NULL DEFAULT '',
  document_sha256 TEXT NOT NULL DEFAULT '',
  signature_certificate_fingerprint TEXT NOT NULL DEFAULT '',
  signed_at TEXT,
  issued_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS electronic_prescriptions_doctor_date_idx
  ON electronic_prescriptions(doctor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS electronic_prescriptions_doctor_patient_idx
  ON electronic_prescriptions(doctor_id, patient_name);

CREATE UNIQUE INDEX IF NOT EXISTS electronic_prescriptions_sncr_number_idx
  ON electronic_prescriptions(sncr_number)
  WHERE sncr_number <> '';

CREATE TABLE IF NOT EXISTS electronic_prescription_events (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  prescription_id TEXT REFERENCES electronic_prescriptions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_details TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS electronic_prescription_events_doctor_date_idx
  ON electronic_prescription_events(doctor_id, created_at DESC);
