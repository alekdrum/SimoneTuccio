-- Schema di simonetuccio.it — Postgres (Neon)
-- Idempotente: si può rilanciare senza perdere dati.

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id         SERIAL PRIMARY KEY,
  slug       TEXT UNIQUE NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  published  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_created_idx ON posts (created_at DESC);

CREATE TABLE IF NOT EXISTS socials (
  id       SERIAL PRIMARY KEY,
  platform TEXT NOT NULL,
  label    TEXT NOT NULL,
  url      TEXT NOT NULL,
  position INT  NOT NULL DEFAULT 0,
  visible  BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS socials_pos_idx ON socials (position);

CREATE TABLE IF NOT EXISTS archive_items (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  kind         TEXT NOT NULL CHECK (kind IN ('audio','image','document','video','other')),
  url          TEXT NOT NULL,
  filename     TEXT NOT NULL,
  size_bytes   BIGINT,
  content_type TEXT,
  position     INT NOT NULL DEFAULT 0,
  visible      BOOLEAN NOT NULL DEFAULT TRUE,
  downloads    INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contatore visite: riga singola, incremento atomico lato database.
CREATE TABLE IF NOT EXISTS visits (
  id    INT PRIMARY KEY DEFAULT 1,
  count BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT visits_single_row CHECK (id = 1)
);
INSERT INTO visits (id, count) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;

-- Punteggi del gioco
CREATE TABLE IF NOT EXISTS game_scores (
  id         SERIAL PRIMARY KEY,
  nickname   TEXT NOT NULL,
  score      INT NOT NULL CHECK (score >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS game_scores_idx ON game_scores (score DESC, created_at ASC);

-- Admin. La password è salvata come scrypt, mai in chiaro.
CREATE TABLE IF NOT EXISTS admin_users (
  id              SERIAL PRIMARY KEY,
  username        TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
