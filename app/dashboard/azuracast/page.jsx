"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  FiAlertTriangle,
  FiActivity,
  FiClock,
  FiCopy,
  FiEye,
  FiEyeOff,
  FiHeadphones,
  FiPlay,
  FiRefreshCw,
  FiRotateCw,
  FiServer,
  FiSquare,
} from "react-icons/fi";
import { hasAnyRole } from "@/lib/roleUtils";

const ACTIONS = [
  {
    id: "start",
    label: "Start",
    confirm: "START",
    icon: FiPlay,
    buttonClass: "bg-green-600 hover:bg-green-700 text-white",
  },
  {
    id: "stop",
    label: "Stop",
    confirm: "STOP",
    icon: FiSquare,
    buttonClass: "bg-red-600 hover:bg-red-700 text-white",
  },
  {
    id: "restart",
    label: "Restart",
    confirm: "RESTART",
    icon: FiRotateCw,
    buttonClass: "bg-gray-900 hover:bg-black text-white",
  },
];

function statusTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (["running", "true", "online", "on", "1"].includes(normalized)) {
    return "bg-green-100 text-green-700 border-green-200";
  }
  if (["stopped", "false", "offline", "off", "0"].includes(normalized)) {
    return "bg-red-100 text-red-700 border-red-200";
  }
  return "bg-yellow-100 text-yellow-700 border-yellow-200";
}

function statusDotTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (["running", "true", "online", "on", "1"].includes(normalized)) {
    return "bg-green-500";
  }
  if (["stopped", "false", "offline", "off", "0"].includes(normalized)) {
    return "bg-red-500";
  }
  return "bg-yellow-500";
}

function Panel({ children, className = "" }) {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function StatCard({ label, value, description, icon: Icon }) {
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-gray-500 font-body">{label}</p>
        {Icon && (
          <span className="w-9 h-9 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
            <Icon size={18} />
          </span>
        )}
      </div>
      <p className="text-4xl font-heading font-bold text-gray-900 mt-1">
        {value ?? "-"}
      </p>
      {description && (
        <p className="text-xs text-gray-500 font-body mt-2 leading-relaxed">
          {description}
        </p>
      )}
    </Panel>
  );
}

function ListenerChart({ data }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const width = 720;
  const height = 220;
  const padding = 28;
  const points = data
    .filter((item) => typeof item.current === "number")
    .map((item) => ({
      value: item.current,
      date: new Date(item.createdAt),
    }));

  if (points.length < 2) {
    return (
      <Panel className="p-6 text-sm text-gray-500 font-body">
        Belum cukup data untuk grafik. Refresh status beberapa kali atau tunggu
        snapshot terkumpul.
      </Panel>
    );
  }

  const maxValue = Math.max(1, ...points.map((point) => point.value));
  const minTime = points[0].date.getTime();
  const maxTime = points[points.length - 1].date.getTime();
  const timeRange = Math.max(1, maxTime - minTime);
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const coords = points.map((point) => ({
    x: padding + ((point.date.getTime() - minTime) / timeRange) * plotWidth,
    y: padding + (1 - point.value / maxValue) * plotHeight,
    ...point,
  }));
  const path = coords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <Panel className="p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-heading font-bold text-lg text-gray-900">
            Listener Trend
          </h3>
          <p className="text-xs text-gray-500 font-body">
            {points.length} snapshots in the selected range.
          </p>
        </div>
        <p className="text-xs text-gray-400 font-body">Max: {maxValue}</p>
      </div>
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[520px] h-auto"
          role="img"
          aria-label="Listener trend chart"
        >
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
          {[0, 0.5, 1].map((tick) => {
            const y = padding + (1 - tick) * plotHeight;
            return (
              <g key={tick}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#f3f4f6"
                  strokeWidth="1"
                />
                <text
                  x={padding - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-gray-400 text-[10px]"
                >
                  {Math.round(maxValue * tick)}
                </text>
              </g>
            );
          })}
          <path d={path} fill="none" stroke="#2563eb" strokeWidth="3" />
          {coords.map((point, index) => (
            <g key={`${point.date.toISOString()}-${index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="8"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
                onFocus={() => setHoveredPoint(point)}
                onBlur={() => setHoveredPoint(null)}
                tabIndex={0}
              />
              <circle cx={point.x} cy={point.y} r="3" fill="#2563eb" />
            </g>
          ))}
          {hoveredPoint && (
            <g pointerEvents="none">
              <line
                x1={hoveredPoint.x}
                y1={padding}
                x2={hoveredPoint.x}
                y2={height - padding}
                stroke="#93c5fd"
                strokeDasharray="4 4"
              />
              <rect
                x={Math.min(hoveredPoint.x + 10, width - 210)}
                y={Math.max(hoveredPoint.y - 58, 8)}
                width="200"
                height="48"
                rx="6"
                fill="#111827"
              />
              <text
                x={Math.min(hoveredPoint.x + 22, width - 198)}
                y={Math.max(hoveredPoint.y - 36, 30)}
                className="fill-white text-[11px] font-bold"
              >
                {hoveredPoint.value} listeners
              </text>
              <text
                x={Math.min(hoveredPoint.x + 22, width - 198)}
                y={Math.max(hoveredPoint.y - 18, 48)}
                className="fill-gray-300 text-[10px]"
              >
                {hoveredPoint.date.toLocaleString()}
              </text>
            </g>
          )}
        </svg>
      </div>
    </Panel>
  );
}

function toDatetimeLocalValue(date) {
  const pad = (value) => String(value).padStart(2, "0");
  const local = new Date(date);
  return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(
    local.getDate(),
  )}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
}

export default function AzuraCastDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [showSourcePassword, setShowSourcePassword] = useState(false);
  const [listenerHistory, setListenerHistory] = useState([]);
  const [listenerRange, setListenerRange] = useState(() => {
    const now = new Date();
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return {
      from: toDatetimeLocalValue(from),
      to: toDatetimeLocalValue(now),
    };
  });

  const canManage =
    session && hasAnyRole(session.user.role, ["DEVELOPER", "TECHNIC"]);

  const config = payload?.config || {};
  const liveSource = config?.liveSource || {};
  const serviceStatus = payload?.status?.services || {};
  const listenerStats = payload?.listeners || {};
  const lastChecked = payload?.status?.checkedAt;
  const normalizedStreamStatus = String(serviceStatus.frontend || "unknown");

  const selectedAction = useMemo(
    () => ACTIONS.find((action) => action.id === confirmAction),
    [confirmAction],
  );

  const fetchStatus = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/azuracast/status", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        if (data?.config) setPayload({ config: data.config });
        throw new Error(data?.error || "Failed to fetch status.");
      }
      setPayload(data);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchListenerHistory = async (range = listenerRange) => {
    try {
      const params = new URLSearchParams();
      if (range?.from) params.set("from", new Date(range.from).toISOString());
      if (range?.to) params.set("to", new Date(range.to).toISOString());
      if (!range?.from && !range?.to) params.set("hours", "24");

      const res = await fetch(`/api/azuracast/listeners?${params}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch listeners.");
      setListenerHistory(data.snapshots || []);
    } catch (err) {
      console.warn("Failed to fetch listener history:", err);
    }
  };

  const setPresetRange = (hours) => {
    const now = new Date();
    const from = new Date(now.getTime() - hours * 60 * 60 * 1000);
    const nextRange = {
      from: toDatetimeLocalValue(from),
      to: toDatetimeLocalValue(now),
    };
    setListenerRange(nextRange);
    fetchListenerHistory(nextRange);
  };

  const applyListenerRange = () => {
    fetchListenerHistory(listenerRange);
  };

  useEffect(() => {
    if (canManage) {
      fetchStatus();
      fetchListenerHistory();
    }
    if (sessionStatus !== "loading" && !canManage) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, sessionStatus]);

  const openConfirm = (action) => {
    setConfirmAction(action.id);
    setConfirmText("");
    setError("");
    setSuccess("");
  };

  const closeConfirm = () => {
    setConfirmAction(null);
    setConfirmText("");
  };

  const copyValue = async (value) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setSuccess("Copied to clipboard.");
  };

  const runAction = async () => {
    if (!selectedAction || confirmText !== selectedAction.confirm) return;

    const action = selectedAction;
    setSavingAction(selectedAction.id);
    setError("");
    setSuccess(`${selectedAction.label} action sent to AzuraCast.`);
    closeConfirm();

    try {
      const res = await fetch("/api/azuracast/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: action.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.config) setPayload({ config: data.config });
        throw new Error(data?.error || "Failed to run action.");
      }

      setPayload((prev) => ({
        ...prev,
        config: data.config || prev?.config,
      }));
      fetchStatus({ silent: true });
      fetchListenerHistory();
    } catch (err) {
      setSuccess("");
      setError(err.message);
    } finally {
      setSavingAction("");
    }
  };

  if (sessionStatus === "loading" || loading) {
    return <div className="p-8 text-center font-body">Loading...</div>;
  }

  if (!canManage) {
    return (
      <div className="p-8 text-center font-body text-red-600">
        Access Denied.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Panel className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
              <FiServer size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-heading font-bold text-gray-900">
                  AzuraCast Control
                </h1>
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${statusTone(
                    normalizedStreamStatus,
                  )}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${statusDotTone(
                      normalizedStreamStatus,
                    )}`}
                  />
                  {normalizedStreamStatus}
                </span>
              </div>
              <p className="text-gray-600 font-body mt-1">
                Station {config?.stationId || "-"} on{" "}
                <span className="font-semibold text-gray-800">
                  {config?.baseUrl || "AZURACAST_BASE_URL missing"}
                </span>
              </p>
              {lastChecked && (
                <p className="text-xs text-gray-400 font-body mt-2 inline-flex items-center gap-1">
                  <FiClock size={13} />
                  Last checked: {new Date(lastChecked).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchStatus()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-md font-body font-semibold disabled:opacity-50 cursor-pointer"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </Panel>

      {error && (
        <div className="text-red-600 font-body bg-red-50 border border-red-100 p-3 rounded-md text-sm flex gap-2">
          <FiAlertTriangle className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="text-green-700 font-body bg-green-50 border border-green-100 p-3 rounded-md text-sm">
          {success}
        </div>
      )}

      {!config?.isConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-5">
          <h2 className="font-heading font-bold text-lg mb-2">
            AzuraCast is not configured
          </h2>
          <p className="font-body text-sm">
            Missing env: {(config?.missing || []).join(", ") || "unknown"}.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              label="Current Listeners"
              value={listenerStats.current}
              description="Listener yang sedang terhubung sekarang."
              icon={FiHeadphones}
            />
            <StatCard
              label="Unique Listeners"
              value={listenerStats.unique}
              description="Perkiraan listener unik dari sumber stats."
              icon={FiActivity}
            />
            <StatCard
              label="Peak / Total"
              value={listenerStats.total}
              description="Peak atau total listener yang dilaporkan stream."
              icon={FiServer}
            />
          </div>

          <section className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
              <div>
                <h2 className="font-heading font-bold text-xl text-gray-900">
                  Listener Analytics
                </h2>
                <p className="text-sm text-gray-500 font-body">
                  Grafik disusun dari snapshot listener yang tersimpan.
                </p>
              </div>
              {listenerStats?.source && (
                <p className="text-xs text-gray-400 font-body">
                  Source: {listenerStats.source}
                </p>
              )}
            </div>
            <Panel className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 font-bold mb-1">
                    From
                  </label>
                  <input
                    type="datetime-local"
                    value={listenerRange.from}
                    onChange={(e) =>
                      setListenerRange((prev) => ({
                        ...prev,
                        from: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 p-2 rounded-md font-body text-sm text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 font-bold mb-1">
                    To
                  </label>
                  <input
                    type="datetime-local"
                    value={listenerRange.to}
                    onChange={(e) =>
                      setListenerRange((prev) => ({
                        ...prev,
                        to: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 p-2 rounded-md font-body text-sm text-gray-900 bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={applyListenerRange}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-body font-semibold cursor-pointer"
                >
                  Apply
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  ["1h", 1],
                  ["6h", 6],
                  ["24h", 24],
                  ["7d", 168],
                ].map(([label, hours]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setPresetRange(hours)}
                    className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 font-body cursor-pointer"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Panel>
            <ListenerChart data={listenerHistory} />
            {listenerStats?.error && (
              <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2 font-body">
                Listener stats unavailable: {listenerStats.error}
              </p>
            )}
          </section>
        </section>

        <aside className="space-y-6">
          <Panel className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 font-bold">
                  Streaming Server
                </p>
                <div
                  className={`inline-flex mt-3 px-3 py-1 rounded-full text-sm font-bold border ${statusTone(
                    normalizedStreamStatus,
                  )}`}
                >
                  {normalizedStreamStatus}
                </div>
                <p className="text-xs text-gray-500 font-body mt-3 leading-relaxed">
                  Icecast/Shoutcast listener endpoint untuk audio dari BUTT.
                </p>
              </div>
              <span
                className={`w-3 h-3 rounded-full mt-1 ${statusDotTone(
                  normalizedStreamStatus,
                )}`}
              />
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="font-heading font-bold text-xl text-gray-900">
                  Station Actions
                </h2>
                <p className="text-sm text-gray-500 font-body">
                  Requires typed confirmation.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    disabled={!config?.isConfigured || Boolean(savingAction)}
                    onClick={() => openConfirm(action)}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md font-body font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${action.buttonClass}`}
                  >
                    <Icon />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel className="p-5">
            <details open>
              <summary className="cursor-pointer list-none">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading font-bold text-xl text-gray-900">
                      BUTT Source
                    </h2>
                    <p className="text-sm text-gray-500 font-body">
                      Connection credentials for live broadcast.
                    </p>
                  </div>
                  {!liveSource?.isConfigured && (
                    <span className="text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-md px-2 py-1 font-body">
                      Missing
                    </span>
                  )}
                </div>
              </summary>
              {config?.liveSourceError && (
                <p className="text-xs text-yellow-700 font-body mt-3">
                  Could not read live source details from AzuraCast API,
                  showing env fallback only.
                </p>
              )}
              {!liveSource?.isConfigured && (
                <p className="text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2 font-body mt-3">
                  Missing: {(liveSource?.missing || []).join(", ") || "unknown"}
                </p>
              )}
              <div className="space-y-3 mt-4">
                {[
                  ["Host", liveSource?.host, liveSource?.source?.host],
                  ["Port", liveSource?.port, liveSource?.source?.port],
                  [
                    "Username",
                    liveSource?.username,
                    liveSource?.source?.username,
                  ],
                  ["Mount", liveSource?.mount, liveSource?.source?.mount],
                ].map(([label, value, source]) => (
                  <div
                    key={label}
                    className="border border-gray-200 rounded-md p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-bold">
                        {label}
                      </p>
                      {source && (
                        <span className="text-[11px] text-gray-400 font-body">
                          {source}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <p className="font-body text-sm text-gray-900 break-all flex-1">
                        {value || "Not configured"}
                      </p>
                      {value && (
                        <button
                          type="button"
                          onClick={() => copyValue(value)}
                          className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer"
                          title={`Copy ${label}`}
                        >
                          <FiCopy size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="border border-gray-200 rounded-md p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-bold">
                    Password
                  </p>
                  {liveSource?.source?.password && (
                    <p className="text-[11px] text-gray-400 font-body mt-1">
                      Source: {liveSource.source.password}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <p className="font-body text-sm text-gray-900 break-all flex-1">
                      {liveSource?.password
                        ? showSourcePassword
                          ? liveSource.password
                          : "************"
                        : "Not configured"}
                    </p>
                    {liveSource?.password && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setShowSourcePassword((value) => !value)
                          }
                          className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer"
                          title={
                            showSourcePassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {showSourcePassword ? (
                            <FiEyeOff size={15} />
                          ) : (
                            <FiEye size={15} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyValue(liveSource.password)}
                          className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer"
                          title="Copy password"
                        >
                          <FiCopy size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </details>
          </Panel>
        </aside>
      </div>

      {selectedAction && (
        <div className="fixed inset-0 bg-black/30 z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6">
            <h2 className="font-heading font-bold text-xl text-gray-900">
              Confirm {selectedAction.label}
            </h2>
            <p className="font-body text-sm text-gray-600 mt-2">
              Type{" "}
              <span className="font-bold text-gray-900">
                {selectedAction.confirm}
              </span>{" "}
              to send this action to AzuraCast station{" "}
              <span className="font-bold text-gray-900">
                {config?.stationId || "unknown"}
              </span>
              .
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              className="w-full border border-gray-300 p-3 rounded-md font-body text-gray-900 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 mt-4"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={closeConfirm}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 font-body font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  confirmText !== selectedAction.confirm ||
                  savingAction === selectedAction.id
                }
                onClick={runAction}
                className={`px-4 py-2 rounded-md font-body font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${selectedAction.buttonClass}`}
              >
                {savingAction === selectedAction.id
                  ? "Sending..."
                  : selectedAction.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
