/**
 * Adattatore che fa parlare il driver Neon con un Postgres vero in-process
 * (PGlite). Serve solo ai test: traduce le richieste HTTP di Neon in query
 * PGlite e riconsegna le righe nel formato che il driver si aspetta
 * (valori grezzi come testo, righe come array, elenco dei campi con l'OID).
 */
import http from 'node:http';
import { PGlite } from '@electric-sql/pglite';

// Il driver chiede "Neon-Raw-Text-Output": i valori devono tornare come
// stringhe, perché è poi lui a convertirli guardando il tipo della colonna.
const RAW_OIDS = [
  16, 17, 20, 21, 23, 25, 26, 114, 700, 701,
  1042, 1043, 1082, 1083, 1114, 1184, 1700, 2950, 3802
];
const rawParsers = Object.fromEntries(RAW_OIDS.map(oid => [oid, v => v]));

export async function startShim() {
  const db = await PGlite.create();

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const list = Array.isArray(payload.queries) ? payload.queries : [payload];

        const results = [];
        for (const { query, params } of list) {
          const out = await db.query(query, params ?? [], { rowMode: 'array', parsers: rawParsers });
          results.push({
            command: (query.trim().split(/\s+/)[0] || '').toUpperCase(),
            rowCount: out.rows.length,
            rows: out.rows,
            fields: (out.fields ?? []).map(f => ({
              name: f.name, dataTypeID: f.dataTypeID,
              tableID: 0, columnID: 0, dataTypeSize: -1, dataTypeModifier: -1, format: 'text'
            }))
          });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(Array.isArray(payload.queries) ? { results } : results[0]));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: err.message, code: err.code ?? 'ERRORE' }));
      }
    });
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  return {
    db,
    endpoint: `http://127.0.0.1:${port}/sql`,
    connectionString: 'postgresql://test:test@db.localtest.internal/neondb',
    async stop() {
      await new Promise(resolve => server.close(resolve));
      await db.close();
    }
  };
}
