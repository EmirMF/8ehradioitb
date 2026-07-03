import { NextRequest, NextResponse } from 'next/server';
import { mutedSessions, messages, broadcast } from '@/lib/chat/store';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { text, senderName, sessionId } = body;

  if (!text || !senderName || !sessionId) {
    return NextResponse.json({ error: 'text, senderName, dan sessionId wajib diisi' }, { status: 400 });
  }

  // Cek apakah user sedang dimute
  if (mutedSessions.has(sessionId)) {
    return NextResponse.json({ error: 'Anda telah dibisukan oleh admin.' }, { status: 403 });
  }

  const message = {
    id: crypto.randomUUID(),
    senderName,
    text,
    timestamp: new Date().toISOString(),
  };

  messages.push(message);

  broadcast({
    type: 'new_message',
    message: message
  });

  return NextResponse.json({ success: true, message });
}