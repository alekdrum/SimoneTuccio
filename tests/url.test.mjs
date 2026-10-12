import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl } from '../lib/url.ts';

describe('normalizzazione degli indirizzi social', () => {
  test('lascia intatto un indirizzo già completo', () => {
    assert.equal(normalizeUrl('https://soundcloud.com/simonetuccio'),
                 'https://soundcloud.com/simonetuccio');
  });

  test('aggiunge https:// quando manca — il caso che prima falliva in silenzio', () => {
    assert.equal(normalizeUrl('soundcloud.com/simonetuccio'),
                 'https://soundcloud.com/simonetuccio');
  });

  test('conserva il www se c\'è', () => {
    assert.equal(normalizeUrl('www.tiktok.com/@simonetuccio'),
                 'https://www.tiktok.com/@simonetuccio');
  });

  test('porta http a https invece di rifiutarlo', () => {
    assert.equal(normalizeUrl('http://music.apple.com/it/artist/x'),
                 'https://music.apple.com/it/artist/x');
  });

  test('ignora gli spazi incollati per sbaglio', () => {
    assert.equal(normalizeUrl('  https://soundcloud.com/x  '), 'https://soundcloud.com/x');
    assert.equal(normalizeUrl('\n soundcloud.com/x \n'), 'https://soundcloud.com/x');
  });

  test('conserva parametri e ancore', () => {
    assert.equal(normalizeUrl('open.spotify.com/artist/abc?si=1'),
                 'https://open.spotify.com/artist/abc?si=1');
  });

  test('rifiuta ciò che non è un indirizzo web', () => {
    for (const cattivo of ['', '   ', 'pippo', 'localhost', 'solo parole qui']) {
      assert.equal(normalizeUrl(cattivo), null, `avrebbe dovuto rifiutare: "${cattivo}"`);
    }
  });

  test('rifiuta gli schemi pericolosi', () => {
    // javascript: in un href eseguirebbe codice nel browser di chi visita
    assert.equal(normalizeUrl('javascript:alert(1)'), null);
    assert.equal(normalizeUrl('data:text/html,<script>alert(1)</script>'), null);
    assert.equal(normalizeUrl('file:///etc/passwd'), null);
  });
});

/* ------------------------------------------------------ player SoundCloud -- */

const { soundcloudEmbedUrl } = await import('../lib/url.ts');

describe('player SoundCloud', () => {
  test('costruisce il lettore da un profilo', () => {
    const src = soundcloudEmbedUrl('soundcloud.com/simonetuccio');
    assert.ok(src.startsWith('https://w.soundcloud.com/player/?'));
    assert.ok(decodeURIComponent(src).includes('https://soundcloud.com/simonetuccio'));
  });

  test('funziona anche con playlist e singoli brani', () => {
    assert.ok(soundcloudEmbedUrl('https://soundcloud.com/simonetuccio/sets/hai-visto-la-tv'));
    assert.ok(soundcloudEmbedUrl('https://soundcloud.com/simonetuccio/amen'));
  });

  test('non parte in automatico', () => {
    assert.ok(soundcloudEmbedUrl('soundcloud.com/x').includes('auto_play=false'));
  });

  test('rifiuta domini che non sono SoundCloud', () => {
    // il valore arriva dal pannello e finisce in un <iframe>:
    // non deve poter incorporare un sito qualsiasi
    for (const cattivo of [
      'https://esempio.it/finto',
      'https://soundcloud.com.malevolo.it/x',
      'https://evil.com/?u=soundcloud.com',
      'javascript:alert(1)',
      ''
    ]) {
      assert.equal(soundcloudEmbedUrl(cattivo), null, `avrebbe dovuto rifiutare: "${cattivo}"`);
    }
  });

  test('accetta i sottodomini legittimi', () => {
    assert.ok(soundcloudEmbedUrl('https://on.soundcloud.com/abc123'));
  });
});

/* --------------------------------------------------------- video YouTube -- */

const { youtubeEmbedUrl } = await import('../lib/url.ts');

describe('video YouTube', () => {
  const ID = 'dQw4w9WgXcQ';

  test('riconosce il link classico watch?v=', () => {
    const src = youtubeEmbedUrl(`https://www.youtube.com/watch?v=${ID}`);
    assert.ok(src.startsWith(`https://www.youtube-nocookie.com/embed/${ID}?`), src);
  });

  test('riconosce il link breve youtu.be', () => {
    assert.ok(youtubeEmbedUrl(`https://youtu.be/${ID}`).includes(`/embed/${ID}`));
  });

  test('riconosce gli Shorts', () => {
    assert.ok(youtubeEmbedUrl(`https://www.youtube.com/shorts/${ID}`).includes(`/embed/${ID}`));
  });

  test('riconosce un link incollato senza https://', () => {
    assert.ok(youtubeEmbedUrl(`youtube.com/watch?v=${ID}`).includes(`/embed/${ID}`));
  });

  test('usa il dominio senza cookie di tracciamento', () => {
    assert.ok(youtubeEmbedUrl(`https://youtu.be/${ID}`).startsWith('https://www.youtube-nocookie.com/'));
  });

  test('conserva la playlist se presente', () => {
    const src = youtubeEmbedUrl(`https://www.youtube.com/watch?v=${ID}&list=PLabc123`);
    assert.ok(src.includes('list=PLabc123'), src);
  });

  test('accetta una playlist senza video', () => {
    const src = youtubeEmbedUrl('https://www.youtube.com/playlist?list=PLabc123');
    assert.ok(src.includes('/embed/videoseries'), src);
    assert.ok(src.includes('list=PLabc123'));
  });

  test('rifiuta i domini che non sono YouTube', () => {
    for (const cattivo of [
      'https://esempio.it/video',
      'https://youtube.com.malevolo.it/watch?v=' + ID,
      'javascript:alert(1)',
      ''
    ]) {
      assert.equal(youtubeEmbedUrl(cattivo), null, `avrebbe dovuto rifiutare: "${cattivo}"`);
    }
  });

  test('rifiuta un identificativo di forma sbagliata', () => {
    assert.equal(youtubeEmbedUrl('https://www.youtube.com/watch?v=troppo-corto'), null);
    assert.equal(youtubeEmbedUrl('https://youtu.be/../../etc'), null);
  });
});

/* ------------------------------------------- riconoscimento indirizzi ---- */

const { contieneIndirizzo, spezzaIndirizzi } = await import('../lib/url.ts');

describe('riconoscimento degli indirizzi nel testo', () => {
  test('riconosce le tre forme', () => {
    assert.equal(contieneIndirizzo('vai su https://esempio.it'), true);
    assert.equal(contieneIndirizzo('vai su www.esempio.it'), true);
    assert.equal(contieneIndirizzo('ascolta soundcloud.com/simonetuccio'), true);
  });

  test('NON trasforma in link il testo normale', () => {
    // sono le frasi che stanno davvero sul sito
    for (const frase of [
      'cambia canale.',
      'Atto I – "Inesorabilmente".',
      '300.000+ STREAM SU SPOTIFY ▲',
      'spegni le emozioni',
      '100% hand coded ×××',
      'Il viaggio non si chiude qui.',
      'È arrivato il momento di cambiare canale.Basta un click'
    ]) {
      assert.equal(contieneIndirizzo(frase), false, `non doveva essere un link: "${frase}"`);
    }
  });

  test('la ricerca non si porta dietro lo stato fra una chiamata e l\'altra', () => {
    const frase = 'vedi esempio.it';
    assert.equal(contieneIndirizzo(frase), true);
    assert.equal(contieneIndirizzo(frase), true, 'la seconda chiamata deve dare lo stesso esito');
  });

  test('spezza il testo separando gli indirizzi', () => {
    const pezzi = spezzaIndirizzi('ascolta soundcloud.com/x e poi basta.');
    assert.deepEqual(pezzi.map(p => p.tipo), ['testo', 'link', 'testo']);
    assert.equal(pezzi[1].href, 'https://soundcloud.com/x');
  });

  test('la punteggiatura finale resta fuori dal link', () => {
    const pezzi = spezzaIndirizzi('info su https://esempio.it/tour.');
    const link = pezzi.find(p => p.tipo === 'link');
    assert.equal(link.href, 'https://esempio.it/tour');
    assert.equal(link.coda, '.');
  });

  test('uno schema pericoloso resta testo, non diventa link', () => {
    const pezzi = spezzaIndirizzi('clicca javascript:alert(1) adesso');
    assert.equal(pezzi.every(p => p.tipo === 'testo'), true, JSON.stringify(pezzi));
  });
});
