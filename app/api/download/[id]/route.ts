import { NextResponse } from 'next/server';
import { getArchiveItem, countDownload } from '@/lib/queries';

export const dynamic = 'force-dynamic';

/**
 * Passaggio intermedio prima del file: conta lo scaricamento e poi manda
 * l'utente al file vero. Serve anche a non esporre in pagina l'indirizzo
 * diretto dello storage, che così può cambiare senza rompere i link.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId) || itemId < 1) {
    return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 });
  }

  try {
    const item = await getArchiveItem(itemId);
    if (!item || !item.visible) {
      return NextResponse.json({ error: 'File non trovato' }, { status: 404 });
    }

    // Il conteggio non deve far fallire lo scaricamento.
    countDownload(itemId).catch(err => console.error('[ST] conteggio download fallito:', err));

    // "?download=1" fa scaricare il file invece di aprirlo nel browser.
    const url = new URL(item.url);
    url.searchParams.set('download', '1');
    return NextResponse.redirect(url.toString(), 302);
  } catch (err) {
    console.error('[ST] download fallito:', err);
    return NextResponse.json({ error: 'Servizio non disponibile' }, { status: 503 });
  }
}
