import { neon, neonConfig, type NeonQueryFunction } from '@neondatabase/serverless';

/**
 * Nomi possibili della stringa di connessione, in ordine di preferenza.
 *
 * L'integrazione Neon su Vercel non usa sempre lo stesso nome: può creare
 * DATABASE_URL, oppure anteporre un prefisso a tutte le variabili
 * (DATABASE_DATABASE_URL), oppure ancora le varianti POSTGRES_*.
 * Invece di imporre un nome e costringere a rinominare a mano, si prende
 * la prima che esiste.
 *
 * Le varianti "pooled" vengono prima: su funzioni serverless sono quelle
 * giuste, perché ogni invocazione apre una connessione nuova.
 */
const CANDIDATE_VARS = [
  'DATABASE_URL',
  'DATABASE_DATABASE_URL',
  'POSTGRES_URL',
  'DATABASE_POSTGRES_URL',
  'DATABASE_URL_UNPOOLED',
  'DATABASE_DATABASE_URL_UNPOOLED',
  'POSTGRES_URL_NON_POOLING',
  'DATABASE_POSTGRES_URL_NON_POOLING'
] as const;

/** Ritorna [nome, valore] della prima variabile valorizzata, oppure null. */
export function resolveConnectionString(): readonly [string, string] | null {
  for (const name of CANDIDATE_VARS) {
    const value = process.env[name];
    if (value && value.trim()) return [name, value.trim()] as const;
  }
  return null;
}

let client: NeonQueryFunction<false, false> | null = null;

function connect(): NeonQueryFunction<false, false> {
  if (client) return client;

  const resolved = resolveConnectionString();
  if (!resolved) {
    throw new Error(
      'Nessuna stringa di connessione al database trovata. Cercate, in ordine: ' +
      CANDIDATE_VARS.join(', ') +
      '. Su Vercel: collega Neon al progetto (Storage), poi ridistribuisci. ' +
      'In locale: copia .env.example in .env.local e compilala.'
    );
  }

  const [name, connectionString] = resolved;
  // Solo il NOME della variabile finisce nei log, mai il suo contenuto.
  console.log(`[ST] database: uso la variabile ${name}`);

  // In produzione il driver parla con Neon sul suo endpoint standard.
  // NEON_FETCH_ENDPOINT serve a puntare altrove — un Postgres locale dietro
  // un adattatore, come nei test — e normalmente non va impostata.
  if (process.env.NEON_FETCH_ENDPOINT) {
    neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT;
  }

  client = neon(connectionString);
  return client;
}

/**
 * Client Neon su HTTP: una connessione per query, senza pool da gestire.
 * È il modello giusto per le funzioni serverless di Vercel, che non
 * mantengono stato fra un'invocazione e l'altra.
 *
 * Il collegamento avviene alla prima query, non all'importazione: così la
 * compilazione riesce anche prima che il database sia collegato, e un errore
 * di configurazione si manifesta come pagina di riserva invece che come
 * build fallita.
 *
 * Si usa SEMPRE come template tag — sql`select ... ${valore}` — così i
 * valori viaggiano come parametri e non per concatenazione: niente SQL injection.
 */
export const sql = new Proxy(function () {} as unknown as NeonQueryFunction<false, false>, {
  apply(_target, _thisArg, args: Parameters<NeonQueryFunction<false, false>>) {
    return connect()(...args);
  },
  get(_target, prop: string) {
    const c = connect() as unknown as Record<string, unknown>;
    const value = c[prop];
    return typeof value === 'function' ? value.bind(c) : value;
  }
});
