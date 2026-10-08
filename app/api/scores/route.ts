import { NextResponse } from 'next/server';
import { getTopScores, addScore } from '@/lib/queries';

export const dynamic = 'force-dynamic';

// Il campo di gioco è 20×20: oltre 400 punti il serpente non ci sta.
// Serve a scartare i punteggi palesemente inventati.
const MAX_PLAUSIBLE_SCORE = 400;

export async function GET() {
  try {
    return NextResponse.json({ scores: await getTopScores(10) });
  } catch {
    return NextResponse.json({ scores: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nickname = String(body?.nickname ?? '').trim().slice(0, 16);
    const score = Number(body?.score);

    if (!nickname) {
      return NextResponse.json({ error: 'Nome mancante' }, { status: 400 });
    }
    if (!Number.isInteger(score) || score < 1 || score > MAX_PLAUSIBLE_SCORE) {
      return NextResponse.json({ error: 'Punteggio non valido' }, { status: 400 });
    }

    await addScore(nickname, score);
    return NextResponse.json({ ok: true, scores: await getTopScores(10) });
  } catch (err) {
    console.error('[ST] salvataggio punteggio fallito:', err);
    return NextResponse.json({ error: 'Salvataggio non riuscito' }, { status: 503 });
  }
}
