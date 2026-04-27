import { NextResponse } from 'next/server';
import { getPublicBoard } from '@/lib/board';

export async function GET() {
  const board = await getPublicBoard();
  return NextResponse.json({ board });
}