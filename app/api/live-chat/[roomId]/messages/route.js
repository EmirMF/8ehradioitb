// GET  /api/live-chat/[roomId]/messages — history pesan
// POST /api/live-chat/[roomId]/messages — kirim pesan baru
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveGuest, serializeMessage } from "../../_shared";
import { checkRateLimit } from "@/lib/rateLimit";
import { triggerChatEvent } from "@/lib/pusher";

const MAX_MESSAGE_LENGTH = 300;
const HISTORY_LIMIT = 50;

// ── GET: history ──────────────────────────────────────
export async function GET(req, { params }) {
  const { roomId } = await params;
  const resolved = await resolveGuest({ requireOnAir: false });
  if (!resolved.ok) return resolved.response;

  // Optional cursor pagination: ?before=<isoDate>
  const url = new URL(req.url);
  const before = url.searchParams.get("before");
  const where = { roomId };
  if (before) {
    where.createdAt = { lt: new Date(before) };
  }

  const messages = await prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });

  // Desc dari DB → balik ke ascending untuk tampilan kronologis
  return NextResponse.json({
    messages: messages.reverse().map(serializeMessage),
  });
}

// ── POST: kirim pesan ─────────────────────────────────
export async function POST(req, { params }) {
  const { roomId } = await params;
  const resolved = await resolveGuest({ requireOnAir: true, requireActiveRoom: false });
  if (!resolved.ok) return resolved.response;

  const { guestSession } = resolved;

  // Pastikan room yang dimaksud benar-benar ada & aktif
  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!room || !room.isActive) {
    return NextResponse.json(
      { error: "Chat room tidak aktif." },
      { status: 403 },
    );
  }
  // Pastikan guest menempel ke broadcast yang sama dengan room
  if (guestSession.broadcastId && room.broadcastId && guestSession.broadcastId !== room.broadcastId) {
    return NextResponse.json(
      { error: "Session kamu untuk siaran sebelumnya. Silakan masuk lagi." },
      { status: 401 },
    );
  }

  // Mute check
  if (guestSession.isMuted) {
    return NextResponse.json(
      { error: "Kamu telah di-mute oleh moderator." },
      { status: 403 },
    );
  }

  // Body
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }
  const content = (body?.content || "").trim();
  if (!content) {
    return NextResponse.json({ error: "Pesan tidak boleh kosong." }, { status: 400 });
  }
  if (content.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Pesan maksimal ${MAX_MESSAGE_LENGTH} karakter.` },
      { status: 400 },
    );
  }

  // Rate limit
  const rl = checkRateLimit(guestSession.sessionId);
  if (!rl.allowed) {
    const seconds = Math.ceil(rl.retryAfterMs / 1000);
    return NextResponse.json(
      {
        error: `Kamu mengirim terlalu banyak pesan. Coba lagi dalam ${seconds} detik.`,
        retryAfterMs: rl.retryAfterMs,
      },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
      },
    );
  }

  const message = await prisma.chatMessage.create({
    data: {
      roomId,
      sessionId: guestSession.id,
      guestName: guestSession.guestName,
      content,
    },
  });

  // Broadcast realtime (best-effort)
  await triggerChatEvent(roomId, {
    name: "new-message",
    data: serializeMessage(message),
  });

  return NextResponse.json(
    { message: serializeMessage(message), remaining: rl.remaining },
    { status: 201 },
  );
}
