// GET /api/live-chat/[roomId]/stats — jumlah pendengar aktif (public)
//
// Mengambil member_count dari Pusher presence channel `presence-chat-{roomId}`
// via Pusher REST API, dengan cache singkat (5 detik) untuk mengurangi beban.
import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";

const CACHE_TTL_MS = 5_000;
const cache = new Map(); // roomId -> { count, expiresAt }

export async function GET(_req, { params }) {
  const { roomId } = await params;

  const cached = cache.get(roomId);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ activeListeners: cached.count });
  }

  let count = 0;
  if (pusherServer) {
    try {
      const res = await pusherServer.get({
        path: `/channels/presence-chat-${encodeURIComponent(roomId)}`,
        params: { info: "user_count" },
      });
      const body =
        typeof res?.body === "string" ? JSON.parse(res.body) : res?.body ?? {};
      count = body?.user_count ?? 0;
    } catch (err) {
      console.error("[stats] gagal ambil presence count:", err?.message || err);
      count = 0;
    }
  }

  cache.set(roomId, { count, expiresAt: Date.now() + CACHE_TTL_MS });
  return NextResponse.json({ activeListeners: count });
}
