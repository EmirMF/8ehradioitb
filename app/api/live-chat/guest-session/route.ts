import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setGuestSessionCookie, getSessionIdFromCookie } from "@/lib/live-chat/auth";
import { sanitizeNickname } from "@/lib/live-chat/validate";
import { getOrSyncActiveRoom } from "@/lib/live-chat/room";

/**
 * POST /api/live-chat/guest-session
 * Body: { nickname: string }
 * Auth: Public
 *
 * Membuat GuestSession baru, simpan sessionId ke cookie iron-session
 * (signed + encrypted). Dipanggil saat modal nama panggilan pertama kali
 * di-submit, ATAU saat session lama sudah expired dan siaran baru dimulai
 * (modal muncul lagi, lalu hit endpoint ini lagi untuk session baru).
 *
 * expiresAt di-set mengikuti broadcastId room yang sedang aktif — kalau
 * tidak ada room aktif (siaran belum live), tetap dibuat sesi tapi dengan
 * expiresAt = sekarang + buffer kecil, karena tanpa room aktif, sesi ini
 * memang belum berguna untuk kirim pesan.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body harus JSON valid" }, { status: 400 });
  }

  const nickname = sanitizeNickname((body as Record<string, unknown>)?.nickname);
  if (!nickname) {
    return NextResponse.json(
      { error: "Nama panggilan wajib diisi, minimal 2 dan maksimal 30 karakter" },
      { status: 400 }
    );
  }

  const room = await getOrSyncActiveRoom();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  // expiresAt dipakai sebagai hard-limit/housekeeping. Validasi utama "apakah
  // siaran masih live" tetap dicek on-the-fly via getOrSyncActiveRoom() di
  // setiap request lain (lihat lib/auth.ts requireGuestSession untuk detail).
  // Kalau room aktif, beri buffer wajar (12 jam) sebagai pengaman; kalau tidak
  // ada room aktif, beri buffer pendek karena sesi ini belum berguna kirim pesan.
  const expiresAt = room
    ? new Date(Date.now() + 1000 * 60 * 60 * 12)
    : new Date(Date.now() + 1000 * 60 * 10);

  const sessionId = crypto.randomUUID();

  const guestSession = await prisma.guestSession.create({
    data: {
      sessionId,
      guestName: nickname,
      ipAddress: ip,
      isMuted: false,
      requestCount: 0,
      broadcastId: room?.broadcastId ?? null,
      expiresAt,
    },
  });

  await setGuestSessionCookie(sessionId);

  return NextResponse.json(
    {
      sessionId: guestSession.sessionId,
      guestName: guestSession.guestName,
      roomId: room?.id ?? null,
      live: !!room,
    },
    { status: 201 }
  );
}

/**
 * GET /api/live-chat/guest-session
 * Auth: Public
 *
 * Cek status sesi guest saat ini — dipakai frontend untuk menentukan apakah
 * modal nama panggilan perlu ditampilkan, atau guest sudah punya sesi valid.
 */
export async function GET() {
  const sessionId = await getSessionIdFromCookie();
  if (!sessionId) {
    return NextResponse.json({ active: false });
  }

  const session = await prisma.guestSession.findUnique({ where: { sessionId } });

  if (!session || session.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ active: false });
  }

  return NextResponse.json({
    active: true,
    guestName: session.guestName,
    isMuted: session.isMuted,
  });
}
