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
