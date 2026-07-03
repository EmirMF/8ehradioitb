import { NextRequest, NextResponse } from 'next/server';
import { mutedSessions } from '@/lib/chat/store';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sessionId, action } = body;

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId wajib diisi' }, { status: 400 });
  }

  if (action === 'mute') {
    mutedSessions.add(sessionId);
  } else if (action === 'unmute') {
    mutedSessions.delete(sessionId);
  }

  return NextResponse.json({ success: true, muted: mutedSessions.has(sessionId) });
}
