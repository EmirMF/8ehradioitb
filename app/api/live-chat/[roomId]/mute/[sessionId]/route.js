// POST /api/live-chat/[roomId]/mute/[sessionId] — mute guest (admin)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAdmin } from "@/app/api/live-chat/_shared";
import { triggerChatEvent } from "@/lib/pusher";

export async function POST(_req, { params }) {
  const { roomId, sessionId } = await params;
  const admin = await resolveAdmin();
  if (!admin.ok) return admin.response;

  // sessionId di sini adalah GuestSession.sessionId (nanoid), BUKAN ObjectId.
  // Tapi untuk fleksibilitas, cek juga by id (ObjectId).
  const guest = await prisma.guestSession.findFirst({
    where: {
      OR: [{ sessionId }, { id: sessionId }],
    },
  });

  if (!guest) {
    return NextResponse.json(
      { error: "Guest tidak ditemukan." },
      { status: 404 },
    );
  }

  await prisma.guestSession.update({
    where: { id: guest.id },
    data: { isMuted: true },
  });

  await triggerChatEvent(roomId, {
    name: "guest-muted",
    data: { sessionId: guest.sessionId },
  });

  return NextResponse.json({ ok: true, guestSessionId: guest.sessionId });
}
