import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { hasAnyRole } from "@/lib/roleUtils";
import { prisma } from "@/lib/prisma";
import {
  getAzuraCastDashboardConfig,
  getAzuraCastDashboardConfigWithStationDetails,
  getAzuraCastListenerStats,
  getAzuraCastStatus,
} from "@/lib/azuracast";

export const dynamic = "force-dynamic";

function canManage(roleString) {
  return hasAnyRole(roleString, ["DEVELOPER", "TECHNIC"]);
}

function errorResponse(error) {
  return NextResponse.json(
    {
      error: error.message || "AzuraCast request failed",
      code: error.code || "AZURACAST_ERROR",
      config: getAzuraCastDashboardConfig(),
      payload: error.payload || null,
    },
    { status: error.status || 500 },
  );
}

async function recordListenerSnapshot(config, listeners) {
  const hasStats = ["current", "unique", "total"].some(
    (key) => typeof listeners?.[key] === "number",
  );
  if (!config?.stationId || !hasStats) return;

  try {
    await prisma.azuraCastListenerSnapshot.create({
      data: {
        stationId: String(config.stationId),
        current:
          typeof listeners.current === "number" ? listeners.current : null,
        unique: typeof listeners.unique === "number" ? listeners.unique : null,
        total: typeof listeners.total === "number" ? listeners.total : null,
        source: listeners.source || null,
      },
    });
  } catch (error) {
    console.warn("Failed to record AzuraCast listener snapshot:", error);
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [status, config, listeners] = await Promise.all([
      getAzuraCastStatus(),
      getAzuraCastDashboardConfigWithStationDetails(),
      getAzuraCastListenerStats(),
    ]);

    await recordListenerSnapshot(config, listeners);

    return NextResponse.json({ config, status, listeners });
  } catch (error) {
    console.error("Failed to fetch AzuraCast status:", error);
    return errorResponse(error);
  }
}
