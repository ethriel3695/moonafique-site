import { NextResponse } from 'next/server';
import { getOrganizerCsv, getOrganizerSummary, isValidOrganizerToken } from '@/lib/board';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!isValidOrganizerToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const format = url.searchParams.get('format');

  if (format === 'csv') {
    const csv = await getOrganizerCsv();
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="activate-signups.csv"',
      },
    });
  }

  const summary = await getOrganizerSummary();
  return NextResponse.json({ summary });
}