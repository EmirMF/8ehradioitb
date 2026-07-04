import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { hasAnyRole } from "@/lib/roleUtils";
import { broadcastLiveStatus } from "@/lib/live-chat/pusher";
import { getOrSyncActiveRoom } from "@/lib/live-chat/room";

function isAdmin(roleString) {
  return hasAnyRole(roleString, ["DEVELOPER", "TECHNIC"]);
}

export async function GET() {
  const config = await prisma.streamConfig.findFirst();
  return NextResponse.json(config || {});
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { baseUrls, defaultUrl, fallbackUrl, onAir } = await req.json();
  let config = await prisma.streamConfig.findFirst();
  if (config) {
    config = await prisma.streamConfig.update({
      where: { id: config.id },
      data: { baseUrls, defaultUrl, fallbackUrl, onAir },
    });
  } else {
    config = await prisma.streamConfig.create({
      data: { baseUrls, defaultUrl, fallbackUrl, onAir },
    });
  }

  // Notify semua client via Pusher saat onAir berubah.
  // getOrSyncActiveRoom() sekaligus lazy-create/close ChatRoom sesuai onAir baru,
  // sehingga roomId yang dikirim ke client sudah valid dan siap dipakai.
  if (typeof onAir === "boolean") {
    const activeRoom = await getOrSyncActiveRoom();
    await broadcastLiveStatus({
      isLive: !!onAir,
      roomId: activeRoom?.id ?? null,
    });
  }

  return NextResponse.json(config);
}