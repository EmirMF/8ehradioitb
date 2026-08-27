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
  return NextResponse.json(config ? {
    ...config,
    liveChatEnabled: config.liveChatEnabled !== false,
    songRequestEnabled: config.songRequestEnabled !== false,
  } : {});
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { baseUrls, defaultUrl, fallbackUrl, onAir, liveChatEnabled, songRequestEnabled } = await req.json();
  let config = await prisma.streamConfig.findFirst();
  const previousOnAir = config?.onAir ?? false;
  const previousLiveChatEnabled = config?.liveChatEnabled !== false;
  const previousSongRequestEnabled = config?.songRequestEnabled !== false;
  const featureData = {
    liveChatEnabled: liveChatEnabled !== false,
    songRequestEnabled: songRequestEnabled !== false,
  };
  if (config) {
    config = await prisma.streamConfig.update({
      where: { id: config.id },
      data: { baseUrls, defaultUrl, fallbackUrl, onAir, ...featureData },
    });
  } else {
    config = await prisma.streamConfig.create({
      data: { baseUrls, defaultUrl, fallbackUrl, onAir, ...featureData },
    });
  }
  if (
    previousOnAir !== config.onAir ||
    previousLiveChatEnabled !== config.liveChatEnabled ||
    previousSongRequestEnabled !== config.songRequestEnabled
  ) {
    const room = await getOrSyncActiveRoom();
    await broadcastLiveStatus({
      isLive: config.onAir,
      roomId: room?.id ?? null,
      liveChatEnabled: config.liveChatEnabled !== false,
      songRequestEnabled: config.songRequestEnabled !== false,
    });
  }
  return NextResponse.json(config);
} 
