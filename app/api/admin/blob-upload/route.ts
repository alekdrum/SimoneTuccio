import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { currentAdmin } from '@/lib/auth';
import { blobToken } from '@/lib/blob';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

/**
 * Il file viaggia dal browser direttamente allo storage, non attraverso
 * questa funzione: le funzioni serverless di Vercel accettano al massimo
 * 4,5 MB di corpo richiesta, che per un mp3 non basterebbe.
 * Qui si rilascia solo il permesso di caricare, dopo aver verificato
 * che chi lo chiede sia davvero l'admin.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadBody;

    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        if (!(await currentAdmin())) throw new Error('Non autorizzato');
        return {
          allowedContentTypes: [
            'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
            'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/mp4', 'audio/x-m4a',
            'video/mp4', 'video/webm',
            'application/pdf', 'application/zip'
          ],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true
        };
      },
      onUploadCompleted: async () => { /* la riga nel database la scrive l'azione lato server */ },
      // Esplicito: il pacchetto da solo guarderebbe solo BLOB_READ_WRITE_TOKEN
      token: blobToken()
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[ST] rilascio permesso di caricamento fallito:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
