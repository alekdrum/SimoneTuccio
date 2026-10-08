/**
 * Unica fonte di verità per schema e contenuti iniziali.
 * La usano sia /api/setup (dal browser) sia scripts/setup-db.mjs (da terminale),
 * così le due strade non possono divergere.
 */

export const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS settings (
     key        TEXT PRIMARY KEY,
     value      TEXT NOT NULL,
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,

  `CREATE TABLE IF NOT EXISTS posts (
     id         SERIAL PRIMARY KEY,
     slug       TEXT UNIQUE NOT NULL,
     title      TEXT NOT NULL,
     content    TEXT NOT NULL,
     published  BOOLEAN NOT NULL DEFAULT TRUE,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS posts_created_idx ON posts (created_at DESC)`,

  `CREATE TABLE IF NOT EXISTS socials (
     id       SERIAL PRIMARY KEY,
     platform TEXT NOT NULL,
     label    TEXT NOT NULL,
     url      TEXT NOT NULL,
     position INT  NOT NULL DEFAULT 0,
     visible  BOOLEAN NOT NULL DEFAULT TRUE
   )`,
  `CREATE INDEX IF NOT EXISTS socials_pos_idx ON socials (position)`,

  `CREATE TABLE IF NOT EXISTS archive_items (
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
   )`,

  // Contatore visite: riga singola, incremento atomico lato database.
  `CREATE TABLE IF NOT EXISTS visits (
     id    INT PRIMARY KEY DEFAULT 1,
     count BIGINT NOT NULL DEFAULT 0,
     CONSTRAINT visits_single_row CHECK (id = 1)
   )`,
  `INSERT INTO visits (id, count) VALUES (1, 0) ON CONFLICT (id) DO NOTHING`,

  `CREATE TABLE IF NOT EXISTS game_scores (
     id         SERIAL PRIMARY KEY,
     nickname   TEXT NOT NULL,
     score      INT NOT NULL CHECK (score >= 0),
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS game_scores_idx ON game_scores (score DESC, created_at ASC)`,

  // Admin. La password è salvata come scrypt, mai in chiaro.
  `CREATE TABLE IF NOT EXISTS admin_users (
     id              SERIAL PRIMARY KEY,
     username        TEXT UNIQUE NOT NULL,
     password_hash   TEXT NOT NULL,
     failed_attempts INT NOT NULL DEFAULT 0,
     locked_until    TIMESTAMPTZ,
     last_login_at   TIMESTAMPTZ,
     created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
   )`
];

export const DEFAULT_SETTINGS: Record<string, string> = {
  profile_name:   'SIMONE TUCCIO',
  profile_bio:    '«Amen» è fuori ovunque. Hai visto la TV?',
  status_heading: 'Hai visto la TV?',
  status_body: [
    'È arrivato il momento di cambiare canale.',
    '',
    'Basta un semplice click e sarai trascinato in un mondo nuovo, lucido e sgargiante. Spegni le emozioni e goditi il viaggio.',
    '',
    'I primi tre atti già disponibili.',
    '',
    'Atto I – **"Inesorabilmente"**.',
    'Atto II – **"Occhi"**.',
    'Atto III – **"Amen"**.',
    '',
    'Ma fai attenzione.',
    'Il viaggio non si chiude qui.',
    'Il prossimo atto sta arrivando.',
    '',
    '**Rimani sintonizzato.**'
  ].join('\n'),
  ticker_items: [
    '★ NUOVO SINGOLO "AMEN" FUORI ORA ▲',
    '300.000+ STREAM SU SPOTIFY ▲',
    'SEGUIMI SU INSTAGRAM @SIMONETUCCIO ▲'
  ].join('\n'),
  profile_image_url: '/assets/profile.jpg',
  mood_image_url:    '/assets/mood.jpg',
  spotify_artist_id: '7dqy9RM6fw0vzbMf4FZUzC',
  archive_intro:     'Materiale scaricabile liberamente: demo, foto, artwork.',
  soundcloud_url:    '',
  blinkies: [
    'HAI VISTO LA TV?',
    '★ AMEN ★ fuori ora',
    'spegni le emozioni',
    'il prossimo atto sta arrivando',
    'cambia canale.',
    'night person',
    '100% hand coded ×××'
  ].join('\n'),
  meta_description:  'Sito ufficiale di Simone Tuccio. «Hai visto la TV?» — i primi tre atti sono fuori: Inesorabilmente, Occhi, Amen.'
};

/** SoundCloud per primo, come richiesto. Gli indirizzi si correggono dal pannello. */
export const DEFAULT_SOCIALS: Array<[platform: string, label: string, url: string, position: number]> = [
  ['soundcloud',  'SOUNDCLOUD',  'https://soundcloud.com/',                                         0],
  ['spotify',     'SPOTIFY',     'https://open.spotify.com/intl-it/artist/7dqy9RM6fw0vzbMf4FZUzC', 1],
  ['apple_music', 'APPLE MUSIC', 'https://music.apple.com/',                                        2],
  ['instagram',   'INSTAGRAM',   'https://www.instagram.com/simonetuccio/',                         3],
  ['tiktok',      'TIKTOK',      'https://www.tiktok.com/',                                         4]
];
