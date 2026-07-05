import { NextRequest, NextResponse } from 'next/server';
import { mutedSessions, sessions, clients, broadcast } from '@/lib/chat/store';

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

  // Broadcast supaya semua client langsung update
  const activeGuests = Array.from(sessions.values()).map(s => ({
    sessionId: s.sessionId,
    name: s.name,
    isMuted: mutedSessions.has(s.sessionId),
  }));

  const uniqueGuests = Array.from(new Map(activeGuests.map(item => [item.sessionId, item])).values());

  broadcast({
    type: 'system_event',
    activeListeners: clients.size,
    activeGuests: uniqueGuests,
  });

  return NextResponse.json({ success: true, muted: mutedSessions.has(sessionId) });
}