import { NextResponse } from 'next/server';
import { install, tokenMatches } from '@/lib/install';

export const dynamic = 'force-dynamic';

const MIN_TOKEN = 16;
const MIN_PASSWORD = 12;

/**
 * Installazione una tantum, dal browser: evita di dover installare Node
 * e clonare il repository solo per creare le tabelle.
 *
 *   https://<il-sito>/api/setup?token=<SETUP_TOKEN>
 *
 * La rotta esiste SOLO finché la variabile SETUP_TOKEN è impostata: tolta
 * quella, risponde 404 come se non ci fosse. Vanno quindi tolte, a
 * installazione finita, SETUP_TOKEN, ADMIN_USERNAME e ADMIN_PASSWORD.
 */
export async function GET(request: Request) {
  const expected = process.env.SETUP_TOKEN;

  // Senza token configurato la rotta non esiste: nessuna traccia della
  // sua presenza per chi va a tentoni.
  if (!expected || expected.length < MIN_TOKEN) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const given = new URL(request.url).searchParams.get('token') ?? '';
  if (!tokenMatches(given, expected)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (password && password.length < MIN_PASSWORD) {
    return NextResponse.json(
      { errore: `ADMIN_PASSWORD troppo corta: servono almeno ${MIN_PASSWORD} caratteri.` },
      { status: 400 }
    );
  }

  try {
    const report = await install(username, password);
    return NextResponse.json({
      esito: 'installazione completata',
      ...report,
      prossimoPasso: report.admin
        ? 'Vai su /admin ed entra. Poi togli SETUP_TOKEN, ADMIN_USERNAME e ADMIN_PASSWORD dalle variabili di Vercel.'
        : 'Tabelle pronte, ma ADMIN_USERNAME/ADMIN_PASSWORD non erano impostate: aggiungile e richiama questo indirizzo.'
    });
  } catch (err) {
    console.error('[ST] installazione fallita:', err);
    return NextResponse.json(
      { errore: 'Installazione non riuscita.', dettaglio: (err as Error).message },
      { status: 500 }
    );
  }
}
