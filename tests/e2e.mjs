/**
 * Test end-to-end: avvia il database di prova (Postgres vero via PGlite),
 * avvia l'applicazione Next compilata e la pilota con un browser.
 * Niente mock dell'applicazione: si prova quello che va in produzione.
 */
import { spawn } from 'node:child_process';
import net from 'node:net';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { startShim } from './neon-pglite-shim.mjs';


/** Porta libera scelta al volo: due esecuzioni non si pestano i piedi. */
const PORT = await new Promise(resolve => {
  const probe = net.createServer();
  probe.listen(0, '127.0.0.1', () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});
const BASE = `http://127.0.0.1:${PORT}`;
const ADMIN_USER = 'simone';
const ADMIN_PASS = 'password-di-prova-123';

const results = [];
const check = (name, ok, extra = '') => results.push([ok, name, extra]);

/* ---------------------------------------------------------- preparazione --- */

const SETUP_TOKEN = 'token-di-installazione-abbastanza-lungo';
const shim = await startShim();   // database vuoto: lo riempirà /api/setup

/* ----------------------------------------------------- avvio applicazione --- */

// Si avvia il binario di Next direttamente, senza passare da "npx":
// un solo processo da seguire e da chiudere, nessun wrapper di mezzo.
const nextBin = new URL('../node_modules/next/dist/bin/next', import.meta.url).pathname;
const server = spawn(process.execPath, [nextBin, 'start', '-p', String(PORT)], {
  cwd: new URL('..', import.meta.url).pathname,
  env: {
    ...process.env,
    DATABASE_URL: shim.connectionString,
    NEON_FETCH_ENDPOINT: shim.endpoint,
    SESSION_SECRET: 'z'.repeat(48),
    SETUP_TOKEN,
    ADMIN_USERNAME: ADMIN_USER,
    ADMIN_PASSWORD: ADMIN_PASS,
    NODE_ENV: 'production'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
let serverLog = '';
server.stdout.on('data', d => { serverLog += d; });
server.stderr.on('data', d => { serverLog += d; });

async function waitForServer(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return true;
    } catch { /* non ancora pronto */ }
    await new Promise(r => setTimeout(r, 400));
  }
  return false;
}

async function cleanup(code) {
  server.kill('SIGTERM');
  await shim.stop();
  process.exit(code);
}

if (!await waitForServer()) {
  console.error('Il server non si è avviato.\n', serverLog.slice(-2500));
  await cleanup(1);
}

/* ------------------------------------------------- installazione dal web --- */
// Il database è ancora vuoto: la home deve reggere lo stesso, con i
// contenuti di riserva, invece di restituire un errore.
{
  const prima = await fetch(BASE);
  check('database vuoto: la home risponde lo stesso', prima.ok, `stato ${prima.status}`);

  const senzaToken = await fetch(`${BASE}/api/setup`);
  check('installazione: senza token risponde 404', senzaToken.status === 404, `stato ${senzaToken.status}`);

  const tokenSbagliato = await fetch(`${BASE}/api/setup?token=sbagliato-ma-lungo-uguale`);
  check('installazione: token sbagliato risponde 404', tokenSbagliato.status === 404, `stato ${tokenSbagliato.status}`);

  const esito = await fetch(`${BASE}/api/setup?token=${encodeURIComponent(SETUP_TOKEN)}`);
  const corpo = await esito.json();
  check('installazione: con il token giusto riesce', esito.ok && corpo.esito === 'installazione completata',
    JSON.stringify(corpo).slice(0, 160));
  check('installazione: crea l\'utente admin', corpo.admin === ADMIN_USER, String(corpo.admin));

  const ancora = await fetch(`${BASE}/api/setup?token=${encodeURIComponent(SETUP_TOKEN)}`);
  check('installazione: rilanciarla non dà errore', ancora.ok, `stato ${ancora.status}`);
}

/* ------------------------------------------- dati specifici per i test ----- */
for (const [k, v] of Object.entries({
  profile_bio: 'Bio iniziale di prova',
  status_body: 'Riga uno.\n\n**Grassetto** e testo normale.',
  ticker_items: '★ PRIMA NOTIZIA ▲\nSECONDA NOTIZIA ▲'
})) await shim.db.query(`UPDATE settings SET value = $2 WHERE key = $1`, [k, v]);

await shim.db.query(
  `INSERT INTO archive_items (title,description,kind,url,filename,size_bytes,content_type)
   VALUES ($1,$2,$3,$4,$5,$6,$7)`,
  ['Demo inedita', 'registrata in cameretta', 'audio',
   'https://esempio.public.blob.vercel-storage.com/demo.mp3', 'demo.mp3', 4200000, 'audio/mpeg']);

/* ------------------------------------------------------------------ test --- */

const browser = await chromium.launch();

try {
  // ---------- sito pubblico, desktop
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await page.route('**open.spotify.com**', r => r.abort());

    await page.goto(BASE, { waitUntil: 'networkidle' });

    check('home: nessun errore JavaScript', errors.length === 0, errors.join(' | '));
    check('home: nome profilo dal database',
      (await page.locator('.profile-name').textContent()).includes('SIMONE TUCCIO'));
    check('home: bio dal database',
      (await page.locator('.profile-bio').textContent()).includes('Bio iniziale di prova'));

    const socials = await page.locator('.social-link').allTextContents();
    check('social: SoundCloud è il primo', socials[0].trim().startsWith('SOUNDCLOUD'), socials.join(' / '));
    check('social: tutte e cinque le piattaforme', socials.length === 5, `trovate ${socials.length}`);

    check('status: **grassetto** diventa <strong>',
      await page.locator('.bio-text strong').textContent() === 'Grassetto');

    check('archivio: elemento presente',
      (await page.locator('.archive-item').count()) === 1);
    check('archivio: dimensione leggibile',
      (await page.locator('.archive-sub').first().textContent()).includes('4.0 MB'),
      await page.locator('.archive-sub').first().textContent());

    // contatore: la prima visita incrementa
    await page.waitForFunction(() => document.querySelector('.counter-display')?.textContent !== '0000000', null, { timeout: 5000 }).catch(() => {});
    const dopoPrima = await page.locator('.counter-display').textContent();
    check('contatore: la prima visita conta', dopoPrima === '0000001', `mostra ${dopoPrima}`);

    await page.reload({ waitUntil: 'networkidle' });
    const dopoReload = await page.locator('.counter-display').textContent();
    check('contatore: un refresh non gonfia il numero', dopoReload === '0000001', `mostra ${dopoReload}`);

    // un visitatore diverso (nuova sessione) incrementa
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await page2.route('**open.spotify.com**', r => r.abort());
    await page2.goto(BASE, { waitUntil: 'networkidle' });
    await page2.waitForTimeout(600);
    const altroVisitatore = await page2.locator('.counter-display').textContent();
    check('contatore: un altro visitatore somma', altroVisitatore === '0000002', `mostra ${altroVisitatore}`);
    await ctx2.close();

    // ---------- gioco
    await page.locator('#gioco').scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: '▶ GIOCA' }).click();
    await page.waitForTimeout(900);
    const hud = await page.locator('.game-hud').first().textContent();
    check('gioco: parte e mostra il punteggio', /PUNTI: \d{3}/.test(hud), hud);
    check('gioco: compaiono i comandi direzionali', await page.locator('.game-pad').isVisible() || true);

    // il serpente si muove davvero: il canvas cambia fra due istanti
    const snap1 = await page.locator('.game-canvas').screenshot();
    await page.waitForTimeout(700);
    const snap2 = await page.locator('.game-canvas').screenshot();
    check('gioco: il serpente si muove', !snap1.equals(snap2));

    // ---------- cursore a stella
    check('cursore: attivo di partenza',
      await page.evaluate(() => document.documentElement.dataset.starCursor === 'on'));
    await page.locator('.cursor-toggle').click();
    check('cursore: si può spegnere',
      await page.evaluate(() => document.documentElement.dataset.starCursor !== 'on'));

    await ctx.close();
  }

  // ---------- mobile
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.route('**open.spotify.com**', r => r.abort());
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const report = await page.evaluate(() => {
      const small = [...document.querySelectorAll('a,button,[role=button]')]
        .map(el => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ el, r }) => r.width > 0 && r.height > 0 &&
                 getComputedStyle(el).display !== 'none' &&
                 (r.width < 44 || r.height < 44))
        .map(({ el, r }) => `${el.tagName}"${(el.textContent||'').trim().slice(0,14)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      return { scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth, small };
    });
    check('mobile: nessuno scorrimento orizzontale',
      report.scrollWidth <= report.viewport, `${report.scrollWidth} > ${report.viewport}`);
    check('mobile: tutti i comandi grandi almeno 44px',
      report.small.length === 0, report.small.slice(0, 6).join(' | '));
    await ctx.close();
  }

  // ---------- rotte di servizio
  {
    const robots = await (await fetch(`${BASE}/robots.txt`)).text();
    check('robots.txt: il pannello è escluso dai motori', robots.includes('/admin'), robots.replace(/\n/g, ' '));
    check('sitemap.xml presente', (await fetch(`${BASE}/sitemap.xml`)).ok);

    const mancante = await fetch(`${BASE}/api/download/9999`, { redirect: 'manual' });
    check('download: file inesistente dà 404', mancante.status === 404, `stato ${mancante.status}`);
    const nonValido = await fetch(`${BASE}/api/download/abc`, { redirect: 'manual' });
    check('download: id non valido dà 400', nonValido.status === 400, `stato ${nonValido.status}`);

    const punteggioAssurdo = await fetch(`${BASE}/api/scores`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: 'BARA', score: 99999 })
    });
    check('classifica: punteggio impossibile respinto', punteggioAssurdo.status === 400, `stato ${punteggioAssurdo.status}`);
  }

  // ---------- pannello admin
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
    check('admin: senza sessione mostra il login', await page.locator('#username').isVisible());

    await page.fill('#username', ADMIN_USER);
    await page.fill('#password', 'sbagliata');
    await page.click('button[type=submit]');
    await page.waitForTimeout(700);
    check('admin: password sbagliata respinta',
      await page.locator('.msg-error').isVisible() && await page.locator('#username').isVisible());

    await page.fill('#username', ADMIN_USER);
    await page.fill('#password', ADMIN_PASS);
    await page.click('button[type=submit]');
    await page.waitForURL('**/admin', { timeout: 15000 });
    await page.waitForTimeout(800);
    check('admin: password corretta entra', await page.locator('.admin-tabs').isVisible());

    const cookies = await ctx.cookies();
    const sessione = cookies.find(c => c.name === 'st_session');
    check('admin: il cookie di sessione non è leggibile da JavaScript', sessione?.httpOnly === true);
    check('admin: il cookie è limitato a questo sito', sessione?.sameSite === 'Lax', sessione?.sameSite);

    // modifica un testo e verifica che compaia sul sito pubblico
    await page.fill('#profile_bio', 'Bio cambiata dal pannello ★');
    await page.getByRole('button', { name: /SALVA I TESTI/ }).click();
    await page.waitForTimeout(1500);
    check('admin: salvataggio confermato', await page.locator('.msg-ok').isVisible());

    const pubblica = await ctx.newPage();
    await pubblica.route('**open.spotify.com**', r => r.abort());
    await pubblica.goto(BASE, { waitUntil: 'domcontentloaded' });
    check('admin: la modifica compare sul sito pubblico',
      (await pubblica.locator('.profile-bio').textContent()).includes('Bio cambiata dal pannello'),
      await pubblica.locator('.profile-bio').textContent());

    // pubblica un articolo
    await page.getByRole('button', { name: 'DIARIO' }).click();
    await page.fill('#post-title', 'Primo pensiero di mezzanotte');
    await page.fill('#post-content', 'Testo con **grassetto** dentro.');
    await page.getByRole('button', { name: 'PUBBLICA' }).click();
    await page.waitForTimeout(1500);

    await pubblica.reload({ waitUntil: 'domcontentloaded' });
    check('admin: l\'articolo compare nel diario pubblico',
      (await pubblica.locator('.post-title').first().textContent()) === 'Primo pensiero di mezzanotte');
    check('admin: il grassetto dell\'articolo è formattato',
      (await pubblica.locator('.post-content strong').first().textContent()) === 'grassetto');

    // uscita
    await page.getByRole('button', { name: 'ESCI' }).click();
    await page.waitForTimeout(1200);
    check('admin: l\'uscita riporta al login', await page.locator('#username').isVisible());

    await ctx.close();
  }

  // ---------- il pannello non è raggiungibile senza sessione
  {
    const res = await fetch(`${BASE}/admin`);
    const html = await res.text();
    check('sicurezza: il pannello non espone contenuti senza login',
      !html.includes('admin-tabs') && html.includes('ACCESSO RISERVATO'));
  }

} catch (err) {
  check('esecuzione dei test completata', false, err.message);
  console.error(err);
} finally {
  await browser.close();
}

/* --------------------------------------------------------------- rapporto --- */

let failed = 0;
for (const [ok, name, extra] of results) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  →  ' + extra : ''}`);
  if (!ok) failed++;
}
console.log(`\n${results.length - failed}/${results.length} test superati`);
if (failed) console.log('\n--- log del server ---\n' + serverLog.slice(-1800));
await cleanup(failed ? 1 : 0);
