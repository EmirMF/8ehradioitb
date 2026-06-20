import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { triggerSongRequestEvent } from "@/lib/pusher";
import { serializeSongRequest } from "../../_shared";

const VALID_TRANSITIONS = {
  PENDING: ["QUEUED"],
  QUEUED: ["NOW_PLAYING"],
  NOW_PLAYING: ["DONE"],
};

export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const { status: newStatus } = body;
  if (!newStatus) {
    return NextResponse.json({ error: "Status wajib diisi." }, { status: 400 });
  }

  const songRequest = await prisma.songRequest.findUnique({ where: { id } });
  if (!songRequest) {
    return NextResponse.json({ error: "Request tidak ditemukan." }, { status: 404 });
  }

  const allowed = VALID_TRANSITIONS[songRequest.status];
  if (!allowed || !allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `Transisi dari ${songRequest.status} ke ${newStatus} tidak valid.` },
      { status: 400 },
    );
  }

  const operations = [];

  if (newStatus === "NOW_PLAYING") {
    operations.push(
      prisma.songRequest.updateMany({
        where: {
          broadcastId: songRequest.broadcastId,
          status: "NOW_PLAYING",
          id: { not: id },
        },
        data: { status: "DONE" },
      }),
    );
  }

  operations.push(
    prisma.songRequest.update({
      where: { id },
      data: { status: newStatus },
    }),
  );

  const results = await prisma.$transaction(operations);
  const updated = results[results.length - 1];

  await triggerSongRequestEvent(songRequest.broadcastId, {
    name: "queue-updated",
    data: JSON.stringify({ requestId: id, status: newStatus }),
  });

  return NextResponse.json({ request: serializeSongRequest(updated) });
}
