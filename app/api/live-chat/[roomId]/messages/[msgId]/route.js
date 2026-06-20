// DELETE /api/live-chat/[roomId]/messages/[msgId] — soft delete pesan (admin)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAdmin } from "@/app/api/live-chat/_shared";
import { triggerChatEvent } from "@/lib/pusher";

export async function DELETE(_req, { params }) {
  const { roomId, msgId } = await params;
  const admin = await resolveAdmin();
  if (!admin.ok) return admin.response;

  const existing = await prisma.chatMessage.findUnique({ where: { id: msgId } });
  if (!existing || existing.roomId !== roomId) {
    return NextResponse.json({ error: "Pesan tidak ditemukan." }, { status: 404 });
  }

  const updated = await prisma.chatMessage.update({
    where: { id: msgId },
    data: {
      isDeleted: true,
      deletedById: admin.user.id,
      deletedAt: new Date(),
    },
  });

  await triggerChatEvent(roomId, {
    name: "message-deleted",
    data: { msgId },
  });

  return NextResponse.json({ ok: true });
}
