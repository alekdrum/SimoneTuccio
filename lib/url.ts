/**
 * Accetta l'indirizzo come lo si incolla davvero: con o senza "https://",
 * con o senza "www". La versione precedente rifiutava tutto ciò che non
 * cominciava con https:// e l'utente non capiva perché il salvataggio non
 * avvenisse.
 *
 * Restituisce l'indirizzo normalizzato, oppure null se non è un indirizzo web.
 */
export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }

  // Si accetta solo il web, e si sale sempre a https.
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  parsed.protocol = 'https:';

  // Un host senza punto non è un dominio ("pippo", "localhost"...).
  if (!parsed.hostname.includes('.')) return null;

  return parsed.toString();
}

/**
 * Indirizzo del lettore incorporato di SoundCloud a partire dal link di un
 * profilo, di una playlist o di un singolo brano.
 *
 * Si controlla che l'host sia davvero SoundCloud: il valore arriva dal
 * pannello e finisce dentro un <iframe>, quindi non va preso per buono.
 * Restituisce null se non è un link SoundCloud.
 */
export function soundcloudEmbedUrl(raw: string): string | null {
  const normalizzato = normalizeUrl(raw);
  if (!normalizzato) return null;

  const host = new URL(normalizzato).hostname.toLowerCase();
  const ammesso = host === 'soundcloud.com'
    || host === 'www.soundcloud.com'
    || host === 'on.soundcloud.com'
    || host.endsWith('.soundcloud.com');
  if (!ammesso) return null;

  const params = new URLSearchParams({
    url: normalizzato,
    color: '#7c3aed',
    auto_play: 'false',
    hide_related: 'true',
    show_comments: 'false',
    show_user: 'true',
    show_reposts: 'false',
    show_teaser: 'false',
    visual: 'true'
  });
  return `https://w.soundcloud.com/player/?${params.toString()}`;
}

/**
 * Indirizzo del lettore YouTube incorporato, a partire da un link nelle
 * forme che si incontrano davvero: watch?v=, youtu.be, shorts, live, embed,
 * ed eventualmente una playlist.
 *
 * Si usa il dominio "youtube-nocookie.com": non deposita cookie di
 * tracciamento finché il visitatore non avvia il video.
 *
 * Come per SoundCloud, il valore arriva dal pannello e finisce in un
 * <iframe>: si controlla che l'host sia davvero YouTube e che
 * l'identificativo abbia la forma attesa. Null se non è un link YouTube.
 */
export function youtubeEmbedUrl(raw: string): string | null {
  const normalizzato = normalizeUrl(raw);
  if (!normalizzato) return null;

  const parsed = new URL(normalizzato);
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

  let id: string | null = null;
  if (host === 'youtu.be') {
    id = parsed.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (parsed.pathname === '/watch') {
      id = parsed.searchParams.get('v');
    } else {
      const match = parsed.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
      id = match ? match[1] : null;
    }
  } else {
    return null;
  }

  // Un identificativo YouTube è sempre di 11 caratteri alfanumerici, - e _
  if (id && !/^[A-Za-z0-9_-]{11}$/.test(id)) id = null;

  let list = parsed.searchParams.get('list');
  if (list && !/^[A-Za-z0-9_-]{2,64}$/.test(list)) list = null;

  if (!id && !list) return null;

  const params = new URLSearchParams({ rel: '0', modestbranding: '1' });
  if (list) params.set('list', list);

  return id
    ? `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`
    : `https://www.youtube-nocookie.com/embed/videoseries?${params.toString()}`;
}

/* ------------------------------------- indirizzi dentro un testo libero -- */

/* Domini di primo livello riconosciuti anche senza "http" né "www".
   Serve un elenco chiuso: senza, una frase come "cambia canale.Vedi"
   diventerebbe un link. */
const TLD = 'it|com|net|org|eu|io|me|tv|fm|co|app|info|bio|link|live|store|shop|art|music|page|xyz|de|fr|es|uk|ch|at';

/* Tre forme: con schema, con www, oppure dominio nudo con un TLD noto. */
const INDIRIZZO_SORGENTE =
  '(' +
    'https?:\\/\\/[^\\s<>"\']+' +
    '|www\\.[^\\s<>"\']+' +
    `|[a-z0-9][a-z0-9-]*(?:\\.[a-z0-9-]+)*\\.(?:${TLD})(?:\\/[^\\s<>"']*)?` +
  ')';

/* La punteggiatura finale non fa parte dell'indirizzo:
   "vai su www.sito.it." deve linkare il sito, non il punto. */
const CODA = /[.,;:!?)\]»”'"]+$/;

/** True se il testo contiene almeno un indirizzo. */
export function contieneIndirizzo(testo: string): boolean {
  // Si costruisce ogni volta: una espressione con /g conserva lo stato
  // fra le chiamate e darebbe risultati alternati.
  return new RegExp(INDIRIZZO_SORGENTE, 'i').test(testo);
}

export type Pezzo =
  | { tipo: 'testo'; testo: string }
  | { tipo: 'link'; testo: string; href: string; coda: string };

/**
 * Spezza un testo nei suoi pezzi, separando gli indirizzi dal resto.
 * Logica pura, senza JSX: così è verificabile con i test automatici.
 * L'indirizzo passa da normalizeUrl, quindi schemi come javascript: o
 * data: non diventano mai un link.
 */
export function spezzaIndirizzi(testo: string): Pezzo[] {
  // Con un gruppo di cattura, split() mette gli indirizzi in posizione
  // dispari e il testo normale in posizione pari.
  const parti = testo.split(new RegExp(INDIRIZZO_SORGENTE, 'gi'));

  return parti.flatMap((parte, i): Pezzo[] => {
    if (!parte) return [];
    if (i % 2 === 0) return [{ tipo: 'testo', testo: parte }];

    const coda = parte.match(CODA)?.[0] ?? '';
    const indirizzo = coda ? parte.slice(0, -coda.length) : parte;
    const href = normalizeUrl(indirizzo);

    return href
      ? [{ tipo: 'link', testo: indirizzo, href, coda }]
      : [{ tipo: 'testo', testo: parte }];
  });
}
