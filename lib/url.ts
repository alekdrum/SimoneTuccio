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
