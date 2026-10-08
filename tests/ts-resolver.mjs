/**
 * Next risolve da sé gli import senza estensione ("./db" → "./db.ts").
 * Node, fuori dal bundler, pretende l'estensione. Questo hook colma la
 * differenza, così i test girano sugli stessi sorgenti della produzione
 * senza doverli modificare.
 */
const CANDIDATES = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      for (const ext of CANDIDATES) {
        try { return await nextResolve(specifier + ext, context); } catch { /* prova la prossima */ }
      }
    }
    throw err;
  }
}
