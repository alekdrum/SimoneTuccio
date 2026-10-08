/**
 * Crea lo schema, inserisce i contenuti di partenza e l'utente admin.
 * Si può rilanciare quante volte si vuole: non sovrascrive ciò che esiste.
 *
 *   npm run db:setup
 */
import { readFileSync } from 'node:fs';
import { randomBytes, scrypt as _scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { neon } from '@neondatabase/serverless';

const scrypt = promisify(_scrypt);

const { DATABASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
if (!DATABASE_URL) { console.error('✗ DATABASE_URL mancante in .env.local'); process.exit(1); }

const sql = neon(DATABASE_URL);

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

// --- schema -----------------------------------------------------------------
// Lo schema va eseguito istruzione per istruzione: il driver HTTP di Neon
// non accetta più comandi in una sola query.
const schema = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');
const statements = schema
  .split(/;\s*$/m)
  .map(s => s.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

for (const statement of statements) await sql.query(statement);
console.log(`✓ schema applicato (${statements.length} istruzioni)`);

// --- contenuti di partenza --------------------------------------------------
const defaults = {
  site_title:    'Simone Tuccio',
  site_tagline:  'Hai visto la TV?',
  profile_name:  'SIMONE TUCCIO',
  profile_bio:   '«Amen» è fuori ovunque. Hai visto la TV?',
  status_heading:'Hai visto la TV?',
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
  meta_description:  'Sito ufficiale di Simone Tuccio. «Hai visto la TV?» — i primi tre atti sono fuori: Inesorabilmente, Occhi, Amen.'
};

for (const [key, value] of Object.entries(defaults)) {
  await sql`INSERT INTO settings (key, value) VALUES (${key}, ${value}) ON CONFLICT (key) DO NOTHING`;
}
console.log(`✓ impostazioni di partenza (${Object.keys(defaults).length} voci)`);

// --- social: SoundCloud per primo, come richiesto ---------------------------
const socials = [
  ['soundcloud',  'SOUNDCLOUD',  'https://soundcloud.com/',                                         0],
  ['spotify',     'SPOTIFY',     'https://open.spotify.com/intl-it/artist/7dqy9RM6fw0vzbMf4FZUzC', 1],
  ['apple_music', 'APPLE MUSIC', 'https://music.apple.com/',                                        2],
  ['instagram',   'INSTAGRAM',   'https://www.instagram.com/simonetuccio/',                         3],
  ['tiktok',      'TIKTOK',      'https://www.tiktok.com/',                                         4]
];
for (const [platform, label, url, position] of socials) {
  const exists = await sql`SELECT 1 FROM socials WHERE platform = ${platform}`;
  if (!exists.length) {
    await sql`INSERT INTO socials (platform, label, url, position) VALUES (${platform}, ${label}, ${url}, ${position})`;
  }
}
console.log(`✓ social (${socials.length} piattaforme, SoundCloud per primo)`);

// --- admin ------------------------------------------------------------------
if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.log('• ADMIN_USERNAME/ADMIN_PASSWORD non impostate: utente admin non creato.');
} else if (ADMIN_PASSWORD.length < 12) {
  console.error('✗ ADMIN_PASSWORD troppo corta: servono almeno 12 caratteri.');
  process.exit(1);
} else {
  const hash = await hashPassword(ADMIN_PASSWORD);
  await sql`
    INSERT INTO admin_users (username, password_hash) VALUES (${ADMIN_USERNAME}, ${hash})
    ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash,
                                         failed_attempts = 0, locked_until = NULL
  `;
  console.log(`✓ admin "${ADMIN_USERNAME}" pronto (password aggiornata)`);
}

console.log('\nFatto. Il pannello è su /admin');
