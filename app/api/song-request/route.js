import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveGuest } from "@/app/api/live-chat/_shared";
import { getActiveBroadcast } from "@/lib/broadcast";
import { triggerSongRequestEvent } from "@/lib/pusher";
import { serializeSongRequest } from "./_shared";

const LIMIT = parseInt(process.env.SONG_REQUEST_LIMIT_PER_SESSION || "3", 10);

export async function POST(request) {
  const guest = await resolveGuest({ requireOnAir: true });
  if (!guest.ok) return guest.response;

  const { guestSession } = guest;

  if (guestSession.isMuted) {
    return NextResponse.json(
      { error: "Kamu telah di-mute oleh moderator." },
      { status: 403 },
    );
  }

  const broadcast = await getActiveBroadcast();
  if (!broadcast) {
    return NextResponse.json(
      { error: "Tidak ada siaran aktif." },
      { status: 403 },
    );
  }

  if (guestSession.broadcastId && guestSession.broadcastId !== broadcast.id) {
    return NextResponse.json(
      { error: "Session untuk siaran sebelumnya. Silakan masuk lagi." },
      { status: 401 },
    );
  }

  if (guestSession.requestCount >= LIMIT) {
    return NextResponse.json(
      { error: `Kamu sudah mencapai batas ${LIMIT} request untuk siaran ini.` },
      { status: 429 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const { songTitle, songArtist, songCoverUrl, itunesTrackId, message } = body;

  if (!songTitle?.trim() || songTitle.trim().length > 200) {
    return NextResponse.json(
      { error: "Judul lagu wajib diisi (maks 200 karakter)." },
      { status: 400 },
    );
  }

  if (!songArtist?.trim() || songArtist.trim().length > 200) {
    return NextResponse.json(
      { error: "Nama artis wajib diisi (maks 200 karakter)." },
      { status: 400 },
    );
  }

  if (message && message.length > 200) {
    return NextResponse.json(
      { error: "Pesan maksimal 200 karakter." },
      { status: 400 },
    );
  }

  const duplicate = await prisma.songRequest.findFirst({
    where: {
      broadcastId: broadcast.id,
      songTitle: { equals: songTitle.trim(), mode: "insensitive" },
      songArtist: { equals: songArtist.trim(), mode: "insensitive" },
    },
  });

  if (duplicate) {
    return NextResponse.json(
      { error: "Lagu ini sudah direquest di siaran ini." },
      { status: 409 },
    );
  }

  const [songRequest] = await prisma.$transaction([
    prisma.songRequest.create({
      data: {
        sessionId: guestSession.id,
        guestName: guestSession.guestName,
        songTitle: songTitle.trim(),
        songArtist: songArtist.trim(),
        songCoverUrl: songCoverUrl || null,
        itunesTrackId: itunesTrackId || null,
        message: message?.trim() || null,
        status: "PENDING",
        broadcastId: broadcast.id,
      },
    }),
    prisma.guestSession.update({
      where: { id: guestSession.id },
      data: { requestCount: { increment: 1 } },
    }),
  ]);

  await triggerSongRequestEvent(broadcast.id, {
    name: "song-request-new",
    data: JSON.stringify(serializeSongRequest(songRequest)),
  });

  return NextResponse.json(
    {
      request: serializeSongRequest(songRequest),
      remaining: LIMIT - (guestSession.requestCount + 1),
    },
    { status: 201 },
  );
}
