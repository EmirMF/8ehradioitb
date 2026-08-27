import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { hasAnyRole } from "@/lib/roleUtils";
import { getOrSyncActiveRoom } from "@/lib/live-chat/room";
import { broadcastLiveStatus } from "@/lib/live-chat/pusher";

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
  const previousOnAir = config?.onAir ?? false;
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
  if (previousOnAir !== config.onAir) {
    const room = await getOrSyncActiveRoom();
    await broadcastLiveStatus({
      isLive: config.onAir,
      roomId: room?.id ?? null,
    });
  }
  return NextResponse.json(config);
} 
