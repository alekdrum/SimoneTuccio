import { NextResponse } from 'next/server';
import { incrementVisits, getVisits } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ count: await getVisits() });
  } catch {
    return NextResponse.json({ count: null }, { status: 503 });
  }
}

export async function POST() {
  try {
    return NextResponse.json({ count: await incrementVisits() });
  } catch (err) {
    console.error('[ST] incremento visite fallito:', err);
    return NextResponse.json({ count: null }, { status: 503 });
  }
}
