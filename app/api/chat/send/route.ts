import { NextRequest, NextResponse } from 'next/server';
import { clients, messages } from '@/lib/chat/store';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { text, senderName } = body;

  if (!text || !senderName) {
    return NextResponse.json({ error: 'text dan senderName wajib diisi' }, { status: 400 });
  }

  const message = {
    id: crypto.randomUUID(),
    senderName,
    text,
    timestamp: new Date().toISOString(),
  };

  messages.push(message);

  const data = `data: ${JSON.stringify(message)}\n\n`;
  clients.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(data));
    } catch {
      clients.delete(controller);
    }
  });

  return NextResponse.json({ success: true, message });
}