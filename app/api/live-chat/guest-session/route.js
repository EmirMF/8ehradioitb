// POST /api/live-chat/guest-session
// Buat (atau rejoin) guest session untuk siaran aktif.
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import {
  isStreamOnAir,
  getOrCreateActiveBroadcast,
  getOrCreateChatRoom,
} from "@/lib/broadcast";
import { getGuestSession, saveGuestSession } from "@/lib/session";

// Berapa lama guest session valid (default 12 jam; akan di-expire lebih awal
// saat siaran selesai oleh closeActiveBroadcast).
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function validateName(name) {
  const trimmed = (name || "").trim();
  if (trimmed.length < 2) {
    return "Nama panggilan minimal 2 karakter.";
  }
  if (trimmed.length > 30) {
    return "Nama panggilan maksimal 30 karakter.";
  }
  return null;
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const nameError = validateName(body?.guestName);
  if (nameError) {
    return NextResponse.json({ error: nameError }, { status: 400 });
  }
  const guestName = body.guestName.trim();

  const onAir = await isStreamOnAir();
  if (!onAir) {
    return NextResponse.json(
      { error: "Siaran sedang offline. Live Chat hanya tersedia saat siaran live." },
      { status: 403 },
    );
  }

  const broadcast = await getOrCreateActiveBroadcast();
  const room = await getOrCreateChatRoom(broadcast.id);

  // Cek apakah sudah ada session valid di cookie untuk siaran ini → rejoin
  const existingCookie = await getGuestSession();
  if (existingCookie?.sessionId) {
    const existing = await prisma.guestSession.findUnique({
      where: { sessionId: existingCookie.sessionId },
    });
    const stillValid =
      existing &&
      existing.broadcastId === broadcast.id &&
      (!existing.expiresAt || new Date(existing.expiresAt) > new Date());

    if (stillValid) {
      // Update nama bila berubah
      if (existing.guestName !== guestName) {
        await prisma.guestSession.update({
          where: { id: existing.id },
          data: { guestName },
        });
      }
      return NextResponse.json({
        sessionId: existing.sessionId,
        guestSessionId: existing.id,
        guestName,
        broadcastId: broadcast.id,
        roomId: room.id,
        rejoined: true,
      });
    }
  }

  // Buat guest session baru
  const sessionId = nanoid(24);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  const created = await prisma.guestSession.create({
    data: {
      sessionId,
      guestName,
      ipAddress: ip,
      broadcastId: broadcast.id,
      expiresAt,
    },
  });

  await saveGuestSession({ sessionId, guestName });

  return NextResponse.json({
    sessionId,
    guestSessionId: created.id,
    guestName,
    broadcastId: broadcast.id,
    roomId: room.id,
    rejoined: false,
  });
}
