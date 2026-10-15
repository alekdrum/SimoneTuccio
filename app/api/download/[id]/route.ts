import { NextResponse } from 'next/server';
import { head } from '@vercel/blob';
import { getArchiveItem, countDownload } from '@/lib/queries';
import { blobToken } from '@/lib/blob';

export const dynamic = 'force-dynamic';

/**
 * Passaggio intermedio prima del file: conta lo scaricamento e poi manda
 * l'utente al file vero. Serve anche a non esporre in pagina l'indirizzo
 * diretto dello storage, che così può cambiare senza rompere i link.
 *
 * Prima di reindirizzare si chiede allo storage se il file c'è davvero.
 * Costa una chiamata, ma evita di mandare chi scarica su una pagina di
 * errore grezza dello storage quando il file è stato rimosso o non è mai
 * arrivato: in quel caso qui si vede il motivo nei log e il visitatore
 * legge un messaggio comprensibile.
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

    // Indirizzo di ripiego, costruito a mano: "?download=1" fa scaricare il
    // file invece di aprirlo nel browser.
    let destinazione: string;
    try {
      const url = new URL(item.url);
      url.searchParams.set('download', '1');
      destinazione = url.toString();
    } catch {
      console.error('[ST] indirizzo del file non valido:', item.id, item.filename);
      return NextResponse.json({ error: 'File non disponibile' }, { status: 404 });
    }

    // In locale e nei test il token non c'è: si salta la verifica e si
    // reindirizza comunque, così lo sviluppo non dipende dallo storage.
    const token = blobToken();
    if (token) {
      try {
        const blob = await head(item.url, { token });
        destinazione = blob.downloadUrl;   // indirizzo ufficiale di Vercel
      } catch (err) {
        console.error(
          `[ST] file assente nello storage — id ${item.id}, "${item.filename}", url ${item.url}:`,
          err
        );
        return NextResponse.json(
          { error: 'Questo file non è più disponibile. Segnalalo e lo ricarichiamo.' },
          { status: 404 }
        );
      }
    }

    // Il conteggio non deve far fallire lo scaricamento.
    countDownload(itemId).catch(err => console.error('[ST] conteggio download fallito:', err));

    return NextResponse.redirect(destinazione, 302);
  } catch (err) {
    console.error('[ST] download fallito:', err);
    return NextResponse.json({ error: 'Servizio non disponibile' }, { status: 503 });
  }
}
