/**
 * Nome della variabile col token di scrittura su Blob.
 *
 * Come per il database, l'integrazione su Vercel può anteporre un prefisso
 * alle variabili che crea. Il pacchetto @vercel/blob guarda solo
 * BLOB_READ_WRITE_TOKEN, quindi qui si cerca fra i nomi plausibili e il
 * token si passa poi esplicitamente alle chiamate.
 */
const CANDIDATE_VARS = [
  'BLOB_READ_WRITE_TOKEN',
  'BLOB_BLOB_READ_WRITE_TOKEN',
  'VERCEL_BLOB_READ_WRITE_TOKEN'
] as const;

/** Ritorna [nome, valore] della prima variabile valorizzata, oppure null. */
export function resolveBlobToken(): readonly [string, string] | null {
  for (const name of CANDIDATE_VARS) {
    const value = process.env[name];
    if (value && value.trim()) return [name, value.trim()] as const;
  }
  return null;
}

/** Il token da passare alle chiamate, oppure undefined per lasciar fare al pacchetto. */
export function blobToken(): string | undefined {
  return resolveBlobToken()?.[1];
}

export const BLOB_CANDIDATE_VARS = CANDIDATE_VARS;
