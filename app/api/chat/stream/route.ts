import { NextResponse } from 'next/server';
import { clients } from '@/lib/chat/store';

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);

      const ping = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': ping\n\n'));
        } catch {
          clearInterval(ping);
          clients.delete(controller);
        }
      }, 30000);
    },
    cancel(controller) {
      clients.delete(controller);
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}