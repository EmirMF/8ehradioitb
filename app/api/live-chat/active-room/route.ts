import { NextResponse } from "next/server";
import { getOrSyncActiveRoom } from "@/lib/live-chat/room";

/**
 * GET /api/live-chat/active-room
 * Auth: Public
 *
 * Entry point untuk frontend: cek apakah ada siaran live + room chat aktif.
 * Endpoint ini yang men-trigger lazy create/close ChatRoom berdasarkan
 * StreamConfig.onAir (lihat lib/room.ts untuk strategi lengkap).
 *
 * Response:
 *   { live: true, roomId: "..." }   -> ada room aktif, frontend lanjut ke modal nama
 *   { live: false, roomId: null }   -> siaran tidak live, frontend tampilkan "chat belum dimulai"
 */
export async function GET() {
  const room = await getOrSyncActiveRoom();

  if (!room) {
    return NextResponse.json({ live: false, roomId: null });
  }

  return NextResponse.json({ live: true, roomId: room.id });
}
