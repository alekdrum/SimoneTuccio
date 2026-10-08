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
