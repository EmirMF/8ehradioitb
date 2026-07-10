import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { hasAnyRole } from "@/lib/roleUtils";

function isAdmin(roleString) {
  return hasAnyRole(roleString, ["DEVELOPER", "TECHNIC"]);
}

const DEFAULT_STREAM_URL =
  "http://stream.8ehradioitb.com/listen/8eh_radio_itb/radio.mp3";

function normalizeConfig(config) {
  if (!config) {
    return {
      baseUrls: [DEFAULT_STREAM_URL],
      defaultUrl: DEFAULT_STREAM_URL,
      fallbackUrl: DEFAULT_STREAM_URL,
      onAir: true,
    };
  }

  const baseUrls = Array.isArray(config.baseUrls) ? config.baseUrls : [];
  const defaultUrl = config.defaultUrl || baseUrls[0] || DEFAULT_STREAM_URL;
  const fallbackUrl = config.fallbackUrl || defaultUrl || DEFAULT_STREAM_URL;

  return {
    ...config,
    baseUrls: baseUrls.length > 0 ? baseUrls : [defaultUrl],
    defaultUrl,
    fallbackUrl,
    onAir: typeof config.onAir === "boolean" ? config.onAir : true,
  };
}

export async function GET() {
  const config = await prisma.streamConfig.findFirst();
  return NextResponse.json(normalizeConfig(config));
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
  return NextResponse.json(config);
} 
