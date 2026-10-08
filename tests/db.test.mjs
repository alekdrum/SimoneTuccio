import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startShim } from './neon-pglite-shim.mjs';

let shim, q, auth, crypto_;

before(async () => {
  shim = await startShim();
  // Il modulo del database legge l'ambiente all'importazione: va preparato prima.
  process.env.DATABASE_URL = shim.connectionString;
  process.env.NEON_FETCH_ENDPOINT = shim.endpoint;

  q = await import('../lib/queries.ts');
  auth = await import('../lib/login.ts');
  crypto_ = await import('../lib/crypto.ts');

  const schema = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');
  for (const s of schema.split(/;\s*$/m).map(x => x.replace(/^\s*--.*$/gm, '').trim()).filter(Boolean)) {
    await shim.db.exec(s);
  }
});

after(async () => { await shim.stop(); });

describe('schema', () => {
  test('crea tutte le tabelle previste', async () => {
    const res = await shim.db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    const tables = res.rows.map(r => r.table_name).sort();
    assert.deepEqual(tables, [
      'admin_users', 'archive_items', 'game_scores', 'posts', 'settings', 'socials', 'visits'
    ]);
  });

  test('la tabella visite nasce con una sola riga a zero', async () => {
    assert.equal(await q.getVisits(), 0);
  });

  test('vieta una seconda riga nel contatore', async () => {
    await assert.rejects(() => shim.db.exec(`INSERT INTO visits (id, count) VALUES (2, 0)`));
  });
});

describe('impostazioni', () => {
  test('salva e rilegge', async () => {
    await q.setSetting('profile_bio', 'prima versione');
    assert.equal((await q.getSettings()).profile_bio, 'prima versione');
  });

  test('il secondo salvataggio sovrascrive invece di duplicare', async () => {
    await q.setSetting('profile_bio', 'seconda versione');
    const settings = await q.getSettings();
    assert.equal(settings.profile_bio, 'seconda versione');
    const res = await shim.db.query(`SELECT count(*)::int AS c FROM settings WHERE key = 'profile_bio'`);
    assert.equal(res.rows[0].c, 1);
  });
});

describe('articoli', () => {
  test('crea un articolo con slug leggibile', async () => {
    const post = await q.createPost('Però è già Aprile!', 'Testo.', true);
    assert.equal(post.slug, 'pero-e-gia-aprile');
  });

  test('due titoli uguali non collidono', async () => {
    const a = await q.createPost('Stesso titolo', 'uno', true);
    const b = await q.createPost('Stesso titolo', 'due', true);
    const c = await q.createPost('Stesso titolo', 'tre', true);
    assert.deepEqual([a.slug, b.slug, c.slug], ['stesso-titolo', 'stesso-titolo-2', 'stesso-titolo-3']);
  });

  test('un titolo di soli simboli produce comunque uno slug', async () => {
    const post = await q.createPost('★★★', 'contenuto', true);
    assert.ok(post.slug.startsWith('post'));
  });

  test('le bozze non compaiono al pubblico ma sì nel pannello', async () => {
    await q.createPost('Bozza segreta', 'non pronta', false);
    const pubblici = await q.getPosts(false);
    const tutti = await q.getPosts(true);
    assert.equal(pubblici.some(p => p.title === 'Bozza segreta'), false);
    assert.equal(tutti.some(p => p.title === 'Bozza segreta'), true);
  });

  test('aggiorna ed elimina', async () => {
    const post = await q.createPost('Da modificare', 'v1', true);
    await q.updatePost(post.id, 'Modificato', 'v2', true);
    assert.equal((await q.getPostBySlug('da-modificare')).title, 'Modificato');
    await q.deletePost(post.id);
    assert.equal(await q.getPostBySlug('da-modificare'), null);
  });
});

describe('contatore visite', () => {
  test('venti incrementi in parallelo contano esattamente venti', async () => {
    const prima = await q.getVisits();
    await Promise.all(Array.from({ length: 20 }, () => q.incrementVisits()));
    assert.equal(await q.getVisits(), prima + 20);
  });

  test('restituisce un numero, non una stringa', async () => {
    assert.equal(typeof await q.incrementVisits(), 'number');
  });
});

describe('accesso admin', () => {
  before(async () => {
    const hash = await crypto_.hashPassword('password-di-prova-123');
    await shim.db.query(`INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)`,
      ['simone', hash]);
  });

  test('credenziali corrette aprono', async () => {
    const r = await auth.login('simone', 'password-di-prova-123');
    assert.equal(r.ok, true);
  });

  test('password sbagliata viene respinta', async () => {
    const r = await auth.login('simone', 'sbagliata');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'credenziali');
  });

  test('utente inesistente dà lo stesso messaggio generico', async () => {
    const r = await auth.login('nessuno', 'qualcosa');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'credenziali');
  });

  test('dopo cinque tentativi falliti scatta il blocco', async () => {
    await shim.db.query(`UPDATE admin_users SET failed_attempts = 0, locked_until = NULL WHERE username = 'simone'`);
    let last;
    for (let i = 0; i < 5; i++) last = await auth.login('simone', 'sbagliata');
    assert.equal(last.reason, 'bloccato');

    // ora nemmeno la password giusta passa
    const conGiusta = await auth.login('simone', 'password-di-prova-123');
    assert.equal(conGiusta.ok, false);
    assert.equal(conGiusta.reason, 'bloccato');
  });

  test('un accesso riuscito azzera il contatore dei tentativi', async () => {
    await shim.db.query(`UPDATE admin_users SET failed_attempts = 3, locked_until = NULL WHERE username = 'simone'`);
    assert.equal((await auth.login('simone', 'password-di-prova-123')).ok, true);
    const res = await shim.db.query(`SELECT failed_attempts FROM admin_users WHERE username = 'simone'`);
    assert.equal(res.rows[0].failed_attempts, 0);
  });
});

describe('archivio', () => {
  test('crea, nasconde, conta gli scaricamenti ed elimina', async () => {
    await q.createArchiveItem({
      title: 'Demo inedita', description: null, kind: 'audio',
      url: 'https://esempio.blob.vercel-storage.com/demo.mp3',
      filename: 'demo.mp3', size_bytes: 4_200_000, content_type: 'audio/mpeg'
    });
    const [item] = await q.getArchive(true);
    assert.equal(item.title, 'Demo inedita');
    assert.equal(Number(item.size_bytes), 4_200_000);

    await q.countDownload(item.id);
    await q.countDownload(item.id);
    assert.equal((await q.getArchiveItem(item.id)).downloads, 2);

    await q.updateArchiveItem(item.id, 'Demo inedita', 'con descrizione', false, 5);
    assert.equal((await q.getArchive(false)).length, 0, 'nascosto non deve comparire al pubblico');
    assert.equal((await q.getArchive(true)).length, 1);

    await q.deleteArchiveItem(item.id);
    assert.equal((await q.getArchive(true)).length, 0);
  });

  test('rifiuta un tipo di file non previsto', async () => {
    await assert.rejects(() => q.createArchiveItem({
      title: 'x', description: null, kind: 'eseguibile',
      url: 'https://e.com/x', filename: 'x', size_bytes: 1, content_type: 'application/x-msdownload'
    }));
  });
});

describe('classifica del gioco', () => {
  test('ordina per punteggio decrescente', async () => {
    await q.addScore('ANNA', 12);
    await q.addScore('BRUNO', 40);
    await q.addScore('CARLA', 25);
    const top = await q.getTopScores(10);
    assert.deepEqual(top.map(s => s.nickname), ['BRUNO', 'CARLA', 'ANNA']);
  });

  test('rifiuta un punteggio negativo', async () => {
    await assert.rejects(() => q.addScore('IMBROGLIONE', -5));
  });
});
