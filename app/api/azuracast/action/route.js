import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { hasAnyRole } from "@/lib/roleUtils";
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

    return NextResponse.json({
      config: getAzuraCastDashboardConfig(),
      result: await runAzuraCastAction(action),
    });
  } catch (error) {
    console.error("Failed to run AzuraCast action:", error);
    return errorResponse(error);
  }
}
