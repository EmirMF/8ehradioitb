"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiPlay,
  FiRefreshCw,
  FiRotateCw,
  FiServer,
  FiSquare,
} from "react-icons/fi";
import { hasAnyRole } from "@/lib/roleUtils";

const TRANSIENT_STATUSES = new Set([
  "creating",
  "booting",
  "ending",
  "snapshotting",
  "deleting",
]);

const ACTIONS = {
  start: {
    label: "Start Server",
    confirm: "START",
    endpoint: "/api/broadcast-server/start",
    icon: FiPlay,
    className: "bg-green-600 hover:bg-green-700 text-white",
  },
  end: {
    label: "End Broadcast",
    confirm: "END",
    endpoint: "/api/broadcast-server/end",
    icon: FiSquare,
    className: "bg-red-600 hover:bg-red-700 text-white",
  },
  retry: {
    label: "Retry",
    confirm: "RETRY",
    endpoint: "/api/broadcast-server/retry",
    icon: FiRotateCw,
    className: "bg-gray-900 hover:bg-black text-white",
  },
  extend: {
    label: "Extend Time",
    confirm: "EXTEND",
    endpoint: "/api/broadcast-server/extend",
    icon: FiClock,
    className: "bg-blue-600 hover:bg-blue-700 text-white",
  },
};

const PROCESS_MESSAGES = {
  creating:
    "Server sedang dibuat di Hetzner. Tetap buka halaman ini sampai status berubah.",
  booting:
    "Server sedang booting dan menunggu AzuraCast siap. Jangan tutup atau pindah halaman dulu.",
  ending:
    "Broadcast sedang diakhiri. Tetap di halaman ini sampai proses selesai.",
  snapshotting:
    "Snapshot sedang dibuat. Jangan tutup halaman ini agar proses bisa lanjut ke delete server.",
  deleting:
    "Server lama sedang dihapus setelah snapshot berhasil. Tunggu sampai status kembali idle.",
};

const START_STEPS = [
  {
    id: "creating",
    title: "Create server",
    description: "Hetzner membuat VPS baru dari snapshot terakhir.",
    statuses: ["creating"],
  },
  {
    id: "booting",
    title: "Boot server",
    description: "VPS menyala, cloud-init jalan, dan DNS external mulai update.",
    statuses: ["booting"],
  },
  {
    id: "health-check",
    title: "Check stream",
    description: "Menunggu AzuraCast public URL sehat dan siap dipakai.",
    phases: ["health-check"],
  },
  {
    id: "running",
    title: "Ready",
    description: "Server siap untuk siaran.",
    statuses: ["running"],
  },
];

const END_STEPS = [
  {
    id: "snapshotting",
    title: "Create snapshot",
    description: "Menyimpan kondisi server terakhir sebagai snapshot baru.",
    statuses: ["snapshotting"],
  },
  {
    id: "delete-previous",
    title: "Remove old snapshot",
    description: "Snapshot lama dihapus setelah snapshot baru aman.",
    phases: ["delete-previous-snapshot"],
  },
  {
    id: "deleting",
    title: "Delete server",
    description: "VPS broadcast dihapus supaya biaya berhenti.",
    statuses: ["deleting"],
  },
  {
    id: "idle",
    title: "Finished",
    description: "Broadcast selesai dan server sudah tidak aktif.",
    statuses: ["idle"],
  },
];

function statusTone(status) {
  if (status === "running") return "bg-green-100 text-green-700 border-green-200";
  if (status === "failed") return "bg-red-100 text-red-700 border-red-200";
  if (TRANSIENT_STATUSES.has(status)) {
    return "bg-blue-100 text-blue-700 border-blue-200";
  }
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function getUptime(startedAt) {
  if (!startedAt) return "-";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt)) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getRuntimeMinutes(startedAt) {
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(startedAt)) / 1000 / 60));
}

function getMinutesUntil(value) {
  if (!value) return null;
  const minutes = Math.ceil((new Date(value).getTime() - Date.now()) / 1000 / 60);
  return Number.isFinite(minutes) ? minutes : null;
}

function isLikelyNetworkGlitch(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.name === "TypeError" ||
    message.includes("failed to fetch") ||
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("load failed")
  );
}

function getLifecycleMode(state) {
  if (["creating", "booting", "running"].includes(state.status)) return "start";
  if (["ending", "snapshotting", "deleting"].includes(state.status)) return "end";
  if (state.status === "idle" && state.lastAction === "end") return "end";
  if (state.status === "failed" && state.lastAction === "end") return "end";
  return "start";
}

function getStepState(step, index, steps, state) {
  const status = state.status || "idle";
  const phase = state.phase || "";
  const activeIndex = steps.findIndex(
    (item) =>
      item.statuses?.includes(status) ||
      item.phases?.some((itemPhase) => phase.includes(itemPhase)),
  );
  const currentIndex =
    activeIndex >= 0
      ? activeIndex
      : status === "failed"
        ? Math.max(0, steps.length - 2)
        : 0;

  if (status === "failed" && index === currentIndex) return "failed";
  if (index < currentIndex) return "done";
  if (index === currentIndex) return "active";
  return "pending";
}

function getPrimaryStatusCopy(state, runningAction) {
  if (runningAction) {
    return {
      title: "Sending request",
      description: "Permintaan sedang dikirim. Kalau koneksi sempat putus, halaman ini akan tetap refresh state.",
    };
  }

  if (state.status === "idle") {
    return {
      title: "Server is off",
      description: "Mulai server sebelum siaran. Setelah start, tetap buka halaman ini sampai status ready.",
    };
  }

  if (state.status === "running") {
    return {
      title: "Ready for broadcast",
      description: "Server sudah aktif. Setelah siaran selesai, gunakan End Broadcast agar snapshot dibuat dan VPS dihapus.",
    };
  }

  if (state.status === "failed") {
    return {
      title: "Needs attention",
      description: "Proses berhenti karena error. Cek Last error, lalu Retry jika kondisinya sudah aman.",
    };
  }

  return {
    title: "Processing",
    description:
      PROCESS_MESSAGES[state.status] ||
      "Lifecycle sedang berjalan. Halaman ini melakukan polling untuk melanjutkan proses.",
  };
}

function InfoCard({ label, value }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500 font-bold">
        {label}
      </p>
      <p className="font-body text-gray-900 mt-2 break-all">{value || "-"}</p>
    </div>
  );
}

function getActionHelpText(status) {
  if (status === "idle") {
    return "Klik Start Server sebelum siaran. Setelah itu tunggu sampai status Ready.";
  }
  if (status === "running") {
    return "Server sedang aktif. Klik End Broadcast setelah siaran benar-benar selesai.";
  }
  if (status === "failed") {
    return "Cek Last error dulu. Retry akan melanjutkan proses dari phase terakhir.";
  }
  return "Action dikunci sementara karena lifecycle sedang berjalan.";
}

function RuntimeWarning({ state, config }) {
  if (state.status !== "running") return null;

  const runtimeMinutes = getRuntimeMinutes(state.startedAt);
  const warnAfter = config.warnAfterMinutes || 180;
  const maxRuntime = config.maxRuntimeMinutes || 240;
  const minutesLeft = getMinutesUntil(state.autoEndAt);
  const isOverLimit = minutesLeft !== null && minutesLeft <= 30;
  const shouldWarn = runtimeMinutes >= warnAfter || isOverLimit;

  if (!shouldWarn) return null;

  return (
    <div
      className={`font-body border p-4 rounded-md text-sm flex gap-3 ${
        isOverLimit
          ? "bg-red-50 border-red-200 text-red-700"
          : "bg-yellow-50 border-yellow-200 text-yellow-800"
      }`}
    >
      <FiAlertTriangle className="mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-bold">
          {isOverLimit ? "Auto End is close" : "Broadcast has been running for a while"}
        </p>
        <p className="mt-1">
          Server sudah berjalan {runtimeMinutes} menit. Auto end dijadwalkan{" "}
          {state.autoEndAt ? formatDate(state.autoEndAt) : `setelah ${maxRuntime} menit`}.
        </p>
        <p className="text-xs mt-2">
          Kalau siaran masih berlangsung, gunakan Extend Time untuk menambah waktu.
          Kalau sudah selesai, klik End Broadcast.
        </p>
      </div>
    </div>
  );
}

function OperationSummary({ state, runningAction }) {
  const copy = getPrimaryStatusCopy(state, runningAction);
  const isBusy = TRANSIENT_STATUSES.has(state.status) || runningAction;
  const Icon =
    state.status === "running"
      ? FiCheckCircle
      : state.status === "failed"
        ? FiAlertTriangle
        : isBusy
          ? FiRefreshCw
          : FiServer;

  return (
    <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            state.status === "running"
              ? "bg-green-100 text-green-700"
              : state.status === "failed"
                ? "bg-red-100 text-red-700"
                : isBusy
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-700"
          }`}
        >
          <Icon size={22} className={isBusy ? "animate-spin" : ""} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading font-bold text-2xl text-gray-900">
              {copy.title}
            </h2>
            <span
              className={`inline-flex px-3 py-1 rounded-full border text-xs font-bold ${statusTone(
                state.status,
              )}`}
            >
              {state.status || "unknown"}
            </span>
          </div>
          <p className="text-sm text-gray-600 font-body mt-2 leading-relaxed">
            {copy.description}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="rounded-md bg-gray-50 border border-gray-100 p-3">
              <p className="text-xs text-gray-500 font-bold uppercase">
                Current phase
              </p>
              <p className="text-sm font-body text-gray-900 mt-1 break-all">
                {state.phase || "-"}
              </p>
            </div>
            <div className="rounded-md bg-gray-50 border border-gray-100 p-3">
              <p className="text-xs text-gray-500 font-bold uppercase">
                Active IP
              </p>
              <p className="text-sm font-body text-gray-900 mt-1 break-all">
                {state.activeServerIp || "-"}
              </p>
            </div>
            <div className="rounded-md bg-gray-50 border border-gray-100 p-3">
              <p className="text-xs text-gray-500 font-bold uppercase">
                Uptime
              </p>
              <p className="text-sm font-body text-gray-900 mt-1">
                {getUptime(state.startedAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LifecycleTimeline({ state }) {
  const mode = getLifecycleMode(state);
  const steps = mode === "end" ? END_STEPS : START_STEPS;
  const title = mode === "end" ? "End Broadcast Flow" : "Start Server Flow";
  const helper =
    mode === "end"
      ? "Snapshot dulu, baru server dihapus. Kalau snapshot gagal, server tidak dihapus."
      : "Server dibuat, booting, lalu public AzuraCast URL dicek sampai siap.";

  return (
    <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-5">
        <div>
          <h2 className="font-heading font-bold text-xl text-gray-900">
            {title}
          </h2>
          <p className="text-sm text-gray-500 font-body mt-1">{helper}</p>
        </div>
        {TRANSIENT_STATUSES.has(state.status) && (
          <span className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
            <FiRefreshCw className="animate-spin" />
            Auto refreshing
          </span>
        )}
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const stepState = getStepState(step, index, steps, state);
          const isDone = stepState === "done";
          const isActive = stepState === "active";
          const isFailed = stepState === "failed";

          return (
            <div
              key={step.id}
              className={`flex gap-3 rounded-lg border p-4 ${
                isFailed
                  ? "border-red-200 bg-red-50"
                  : isActive
                    ? "border-blue-200 bg-blue-50"
                    : isDone
                      ? "border-green-100 bg-green-50"
                      : "border-gray-200 bg-white"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                  isFailed
                    ? "bg-red-600 text-white"
                    : isDone
                      ? "bg-green-600 text-white"
                      : isActive
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-500"
                }`}
              >
                {isDone ? <FiCheckCircle /> : index + 1}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-heading font-bold text-gray-900">
                    {step.title}
                  </p>
                  {isActive && (
                    <span className="text-[11px] font-bold uppercase text-blue-700">
                      Current
                    </span>
                  )}
                  {isFailed && (
                    <span className="text-[11px] font-bold uppercase text-red-700">
                      Failed here
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 font-body mt-1">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function BroadcastServerPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [runningAction, setRunningAction] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmText, setConfirmText] = useState("");

  const canManage =
    session && hasAnyRole(session.user.role, ["DEVELOPER", "TECHNIC"]);
  const state = payload?.state || {};
  const config = payload?.config || {};
  const isTransient = TRANSIENT_STATUSES.has(state.status);
  const minutesUntilAutoEnd = getMinutesUntil(state.autoEndAt);
  const canExtend =
    state.status === "running" &&
    minutesUntilAutoEnd !== null &&
    minutesUntilAutoEnd <= (config.extendMinutes || 60);
  const selectedAction = confirmAction ? ACTIONS[confirmAction] : null;

  const availableActions = useMemo(() => {
    if (state.status === "idle") return ["start"];
    if (state.status === "running") {
      return canExtend ? ["extend", "end"] : ["end"];
    }
    if (state.status === "failed") return ["retry"];
    return [];
  }, [canExtend, state.status]);

  const fetchState = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/broadcast-server", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load state.");
      setPayload(data);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) fetchState();
    if (sessionStatus !== "loading" && !canManage) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, sessionStatus]);

  useEffect(() => {
    if (!canManage || !isTransient) return;
    const id = setInterval(() => fetchState({ silent: true }), 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, isTransient]);

  useEffect(() => {
    if (!isTransient && !runningAction) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue =
        "Broadcast Server is still processing. Leaving may pause the lifecycle polling.";
      return event.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isTransient, runningAction]);

  const openConfirm = (actionId) => {
    setConfirmAction(actionId);
    setConfirmText("");
    setError("");
    setSuccess("");
  };

  const closeConfirm = () => {
    setConfirmAction(null);
    setConfirmText("");
  };

  const runAction = async () => {
    if (!confirmAction || !selectedAction) return;
    if (confirmText !== selectedAction.confirm) return;

    const actionId = confirmAction;
    setRunningAction(actionId);
    setSuccess(`${selectedAction.label} requested.`);
    closeConfirm();

    try {
      const res = await fetch(selectedAction.endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Action failed.");
      setPayload(data);
    } catch (err) {
      if (isLikelyNetworkGlitch(err)) {
        setSuccess(
          `${selectedAction.label} may still be processing. Keep this page open while we refresh the state.`,
        );
        setError("");
        fetchState({ silent: true });
        setTimeout(() => fetchState({ silent: true }), 5000);
      } else {
        setSuccess("");
        setError(err.message);
      }
    } finally {
      setRunningAction("");
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
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <FiServer size={22} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-heading font-bold text-gray-900">
                  Broadcast Server
                </h1>
                <span
                  className={`inline-flex px-3 py-1 rounded-full border text-xs font-bold ${statusTone(
                    state.status,
                  )}`}
                >
                  {state.status || "unknown"}
                </span>
              </div>
              <p className="text-gray-600 font-body mt-1">
                Temporary Hetzner server lifecycle for live broadcast.
              </p>
              {state.updatedAt && (
                <p className="text-xs text-gray-400 font-body mt-2 inline-flex items-center gap-1">
                  <FiClock size={13} />
                  Last updated: {formatDate(state.updatedAt)}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchState()}
            className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-md font-body font-semibold cursor-pointer"
          >
            <FiRefreshCw className={isTransient ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </section>

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

      <RuntimeWarning state={state} config={config} />

      {(isTransient || runningAction) && (
        <div className="text-blue-800 font-body bg-blue-50 border border-blue-200 p-4 rounded-md text-sm flex gap-3">
          <FiAlertTriangle className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">Tetap di halaman ini sampai proses selesai.</p>
            <p className="mt-1">
              {PROCESS_MESSAGES[state.status] ||
                "Broadcast Server sedang memproses action. Page ini melakukan polling untuk melanjutkan lifecycle."}
            </p>
            <p className="text-xs text-blue-700 mt-2">
              Status final: <span className="font-bold">running</span> untuk Start,
              atau <span className="font-bold">idle</span> untuk End Broadcast.
            </p>
          </div>
        </div>
      )}

      {!config.isConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-5">
          <h2 className="font-heading font-bold text-lg mb-2">
            Hetzner is not configured
          </h2>
          <p className="font-body text-sm">
            Missing env: {(config.missing || []).join(", ") || "unknown"}.
          </p>
        </div>
      )}

      <OperationSummary state={state} runningAction={runningAction} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <section className="space-y-4">
          <LifecycleTimeline state={state} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCard label="Active Server ID" value={state.activeServerId} />
            <InfoCard label="Server Name" value={state.serverName} />
            <InfoCard label="Latest Snapshot ID" value={state.latestSnapshotId} />
            <InfoCard label="Pending Snapshot ID" value={state.pendingSnapshotId} />
            <InfoCard label="Started At" value={formatDate(state.startedAt)} />
            <InfoCard label="Ended At" value={formatDate(state.endedAt)} />
          </div>
          {state.lastError && (
            <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg p-4 font-body text-sm">
              <p className="font-bold mb-1">Last error</p>
              <p>{state.lastError}</p>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h2 className="font-heading font-bold text-xl text-gray-900">
              Actions
            </h2>
            <p className="text-sm text-gray-500 font-body mt-1">
              {getActionHelpText(state.status)}
            </p>
            <div className="grid grid-cols-1 gap-2 mt-4">
              {availableActions.map((actionId) => {
                const action = ACTIONS[actionId];
                const Icon = action.icon;
                return (
                  <button
                    key={actionId}
                    type="button"
                    disabled={!config.isConfigured || Boolean(runningAction)}
                    onClick={() => openConfirm(actionId)}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md font-body font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${action.className}`}
                  >
                    <Icon />
                    {runningAction === actionId ? "Sending..." : action.label}
                  </button>
                );
              })}
              {availableActions.length === 0 && (
                <div className="text-sm text-blue-700 font-body bg-blue-50 border border-blue-100 rounded-md p-3">
                  Proses sedang berjalan. Tetap buka halaman ini; sistem akan
                  refresh otomatis sampai action berikutnya tersedia.
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h2 className="font-heading font-bold text-xl text-gray-900">
              Hetzner Config
            </h2>
            <div className="space-y-3 mt-4 text-sm font-body">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Server type</span>
                <span className="font-semibold text-gray-900">
                  {config.serverType || "-"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Location</span>
                <span className="font-semibold text-gray-900">
                  {config.location || "-"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">SSH keys</span>
                <span className="font-semibold text-gray-900">
                  {config.hasSshKeys ? "configured" : "-"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">DNS</span>
                <span className="font-semibold text-gray-900">external</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Auto end after</span>
                <span className="font-semibold text-gray-900">
                  {config.maxRuntimeMinutes
                    ? `${config.maxRuntimeMinutes} min`
                    : "-"}
                </span>
              </div>
            </div>
          </section>
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
                to continue.
              </p>
              {confirmAction === "extend" && (
                <p className="font-body text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-md p-3 mt-3">
                  This will add {config.extendMinutes || 60} minutes to the
                  current auto-end deadline.
                </p>
              )}
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
                disabled={confirmText !== selectedAction.confirm}
                onClick={runAction}
                className={`px-4 py-2 rounded-md font-body font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${selectedAction.className}`}
              >
                {selectedAction.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
