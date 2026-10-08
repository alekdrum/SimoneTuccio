import { neon, neonConfig, type NeonQueryFunction } from '@neondatabase/serverless';

let client: NeonQueryFunction<false, false> | null = null;

function connect(): NeonQueryFunction<false, false> {
  if (client) return client;

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL non configurata. In locale: copia .env.example in .env.local. ' +
      'Su Vercel: collega il database Neon al progetto.'
    );
  }

  // In produzione il driver parla con Neon sul suo endpoint standard.
  // NEON_FETCH_ENDPOINT serve a puntare altrove — un Postgres locale dietro
  // un adattatore, come nei test — e normalmente non va impostata.
  if (process.env.NEON_FETCH_ENDPOINT) {
    neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT;
  }

  client = neon(process.env.DATABASE_URL);
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
