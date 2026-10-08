/**
 * Stessa installazione di /api/setup, ma da terminale.
 * Usa gli stessi dati di lib/schema.ts: le due strade non possono divergere.
 *
 *   npm run db:setup
 */
import { install } from '../lib/install.ts';

const { DATABASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;

if (!DATABASE_URL) {
  console.error('✗ DATABASE_URL mancante. Copia .env.example in .env.local e compilala.');
  process.exit(1);
}
if (ADMIN_PASSWORD && ADMIN_PASSWORD.length < 12) {
  console.error('✗ ADMIN_PASSWORD troppo corta: servono almeno 12 caratteri.');
  process.exit(1);
}

const report = await install(ADMIN_USERNAME, ADMIN_PASSWORD);
console.log(`✓ tabelle create (${report.tabelle} istruzioni)`);
console.log(`✓ impostazioni di partenza (${report.impostazioni} voci)`);
console.log(`✓ social (${report.social} piattaforme, SoundCloud per primo)`);
console.log(report.admin ? `✓ admin "${report.admin}" pronto` : '• utente admin non creato (mancano ADMIN_USERNAME/ADMIN_PASSWORD)');
console.log('\nFatto. Il pannello è su /admin');
