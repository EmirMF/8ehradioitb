import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { hasAnyRole } from "@/lib/roleUtils";
import {
  getOrCreateActiveBroadcast,
  getActiveBroadcast,
  closeActiveBroadcast,
} from "@/lib/broadcast";

function isAdmin(roleString) {
  return hasAnyRole(roleString, ["DEVELOPER", "TECHNIC"]);
}

export async function GET() {
  const config = await prisma.streamConfig.findFirst();
  const activeBroadcast = await getActiveBroadcast();
  return NextResponse.json({
    ...(config || {}),
    // Ekspos sesi siaran aktif supaya client tahu ke broadcast mana menempel
    broadcastId: activeBroadcast?.id ?? null,
    broadcastStartedAt: activeBroadcast?.startedAt?.toISOString() ?? null,
  });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { baseUrls, defaultUrl, fallbackUrl, onAir } = await req.json();

  // Kelola siklus Broadcast berdasarkan flag onAir.
  // Hanya reaksi bila nilai onAir eksplisit dikirim (bukan undefined).
  let activeBroadcast = null;
  if (onAir === true) {
    activeBroadcast = await getOrCreateActiveBroadcast();
  } else if (onAir === false) {
    await closeActiveBroadcast();
  }

  let config = await prisma.streamConfig.findFirst();
  const data = { baseUrls, defaultUrl, fallbackUrl, onAir };
  if (config) {
    config = await prisma.streamConfig.update({
      where: { id: config.id },
      data,
    });
  } else {
    config = await prisma.streamConfig.create({ data });
  }

  // Jika onAir tidak diubah, tetap kembalikan broadcast aktif (jika ada)
  if (!activeBroadcast) {
    activeBroadcast = await getActiveBroadcast();
  }

  return NextResponse.json({
    ...config,
    broadcastId: activeBroadcast?.id ?? null,
    broadcastStartedAt: activeBroadcast?.startedAt?.toISOString() ?? null,
  });
}
