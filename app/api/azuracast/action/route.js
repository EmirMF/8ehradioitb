import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { hasAnyRole } from "@/lib/roleUtils";
import { prisma } from "@/lib/prisma";
import {
  getAzuraCastDashboardConfig,
  runAzuraCastAction,
} from "@/lib/azuracast";

export const dynamic = "force-dynamic";

const ACTIONS = new Set(["start", "stop", "restart"]);

function canManage(roleString) {
  return hasAnyRole(roleString, ["DEVELOPER", "TECHNIC"]);
}

function cleanString(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function errorResponse(error) {
  return NextResponse.json(
    {
      error: error.message || "AzuraCast action failed",
      code: error.code || "AZURACAST_ERROR",
      config: getAzuraCastDashboardConfig(),
      payload: error.payload || null,
    },
    { status: error.status || 500 },
  );
}

async function ensureBroadcastServerRunning() {
  const state = await prisma.broadcastServerState.findUnique({
    where: { key: "main" },
    select: { status: true, phase: true },
  });

  if (state?.status === "running") return;

  const error = new Error(
    "Broadcast Server is not running. Start Broadcast Server before controlling AzuraCast.",
  );
  error.status = 409;
  error.code = "BROADCAST_SERVER_OFFLINE";
  error.payload = {
    broadcastServer: {
      status: state?.status || "idle",
      phase: state?.phase || "idle",
    },
  };
  throw error;
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = cleanString(body?.action);

    if (!ACTIONS.has(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await ensureBroadcastServerRunning();

    return NextResponse.json({
      config: getAzuraCastDashboardConfig(),
      result: await runAzuraCastAction(action),
    });
  } catch (error) {
    console.error("Failed to run AzuraCast action:", error);
    return errorResponse(error);
  }
}
