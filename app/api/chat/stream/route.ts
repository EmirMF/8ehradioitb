import { NextRequest, NextResponse } from 'next/server';
import { clients, sessions, broadcast } from '@/lib/chat/store';

function broadcastActiveGuests() {
  const activeGuests = Array.from(sessions.values()).map(s => ({
    sessionId: s.sessionId,
    name: s.name
  }));
  
  // Remove duplicates based on sessionId (if same user has multiple tabs)
  const uniqueGuests = Array.from(new Map(activeGuests.map(item => [item.sessionId, item])).values());
  
  broadcast({
    type: 'system_event',
    activeListeners: clients.size,
    activeGuests: uniqueGuests,
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId') || 'anonymous';
  const name = searchParams.get('name') || 'Guest';

  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);
      sessions.set(controller, { sessionId, name });
      
      // Broadcast updated guest list when someone joins
      broadcastActiveGuests();

      const ping = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': ping\n\n'));
        } catch {
          clearInterval(ping);
          clients.delete(controller);
          sessions.delete(controller);
          broadcastActiveGuests();
        }
      }, 30000);
    },
    cancel(controller) {
      clients.delete(controller);
      sessions.delete(controller);
      broadcastActiveGuests();
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