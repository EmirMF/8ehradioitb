"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback, useRef } from "react";
import { FiMusic, FiSearch, FiX } from "react-icons/fi";
import { getPusherClient } from "@/app/hooks/usePusherClient";

const STATUS_TABS = [
  { key: "ALL", label: "Semua" },
  { key: "PENDING", label: "Pending" },
  { key: "QUEUED", label: "Antrian" },
  { key: "NOW_PLAYING", label: "Playing" },
  { key: "DONE", label: "Selesai" },
  { key: "REJECTED", label: "Ditolak" },
];

const STATUS_BADGE = {
  PENDING: "bg-yellow-100 text-yellow-800",
  QUEUED: "bg-blue-100 text-blue-800",
  NOW_PLAYING: "bg-green-100 text-green-800",
  DONE: "bg-gray-100 text-gray-600",
  REJECTED: "bg-red-100 text-red-800",
};

const STATUS_LABEL = {
  PENDING: "Pending",
  QUEUED: "Antrian",
  NOW_PLAYING: "Playing",
  DONE: "Selesai",
  REJECTED: "Ditolak",
};

function formatRelativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SongRequestsPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [broadcastId, setBroadcastId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const channelRef = useRef(null);

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/song-request/admin");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
        setBroadcastId(data.broadcastId || null);
      }
    } catch { /* noop */ }
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Pusher subscription
  useEffect(() => {
    if (!broadcastId) return;
    const pusher = getPusherClient();
    if (!pusher) {
      const timer = setInterval(fetchRequests, 10_000);
      return () => clearInterval(timer);
    }

    const channel = pusher.subscribe(`broadcast-${broadcastId}`);
    channelRef.current = channel;
    channel.bind("song-request-new", () => fetchRequests());
    channel.bind("queue-updated", () => fetchRequests());

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`broadcast-${broadcastId}`);
      channelRef.current = null;
    };
  }, [broadcastId, fetchRequests]);

  const handleStatusUpdate = async (id, newStatus) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/song-request/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchRequests();
      }
    } catch { /* noop */ }
    finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal);
    try {
      const res = await fetch(`/api/song-request/${rejectModal}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() || null }),
      });
      if (res.ok) {
        await fetchRequests();
        setRejectModal(null);
        setRejectReason("");
      }
    } catch { /* noop */ }
    finally {
      setActionLoading(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (activeTab !== "ALL" && r.status !== activeTab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.songTitle.toLowerCase().includes(q) ||
        r.songArtist.toLowerCase().includes(q) ||
        r.guestName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (!session) {
    return <div className="p-8 text-center font-body">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-heading font-bold text-gray-800">
            Song Requests
          </h1>
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-body font-bold px-2.5 py-1 rounded-full">
              {pendingCount}
            </span>
          )}
        </div>
        <p className="text-gray-600 font-body mt-1">
          Kelola request lagu dari pendengar selama siaran live.
        </p>
      </div>

      {!broadcastId ? (
        <div className="bg-white p-12 rounded-xl shadow-md text-center">
          <FiMusic className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 font-body text-lg">
            Tidak ada siaran aktif saat ini.
          </p>
          <p className="text-gray-400 font-body text-sm mt-1">
            Request lagu akan muncul saat siaran live dimulai.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            {/* Filter tabs */}
            <div className="flex flex-wrap gap-2">
              {STATUS_TABS.map((tab) => {
                const count =
                  tab.key === "ALL"
                    ? requests.length
                    : requests.filter((r) => r.status === tab.key).length;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 text-sm font-body rounded-full transition-colors cursor-pointer ${
                      activeTab === tab.key
                        ? "bg-[#D83232] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {tab.label}
                    {count > 0 && (
                      <span className="ml-1.5 text-xs opacity-75">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari judul, artis, atau nama..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm font-body text-gray-900 focus:ring-2 focus:ring-[#D83232] focus:border-[#D83232] outline-none"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-8 text-center font-body text-gray-400">
              Memuat...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-8 text-center font-body text-gray-400">
              Tidak ada request ditemukan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-body font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3">Lagu</th>
                    <th className="px-4 py-3 hidden md:table-cell">Requester</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Waktu</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      {/* Song info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {req.songCoverUrl ? (
                            <img
                              src={req.songCoverUrl.replace("600x600", "100x100")}
                              alt=""
                              className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <FiMusic className="text-gray-400" size={14} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-body font-medium text-gray-900 truncate max-w-[200px]">
                              {req.songTitle}
                            </p>
                            <p className="text-xs text-gray-500 font-body truncate max-w-[200px]">
                              {req.songArtist}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Requester */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-sm font-body text-gray-900">
                          {req.guestName}
                        </p>
                        {req.message && (
                          <p className="text-xs text-gray-400 font-body italic truncate max-w-[200px]">
                            &quot;{req.message}&quot;
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-body font-medium ${STATUS_BADGE[req.status]}`}
                        >
                          {STATUS_LABEL[req.status]}
                        </span>
                        {req.status === "REJECTED" && req.rejectedReason && (
                          <p className="text-xs text-red-400 font-body mt-1 truncate max-w-[150px]" title={req.rejectedReason}>
                            {req.rejectedReason}
                          </p>
                        )}
                      </td>

                      {/* Time */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span
                          className="text-xs text-gray-400 font-body"
                          title={new Date(req.createdAt).toLocaleString("id-ID")}
                        >
                          {formatRelativeTime(req.createdAt)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {req.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(req.id, "QUEUED")}
                                disabled={actionLoading === req.id}
                                className="px-3 py-1.5 text-xs font-body font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                Antrikan
                              </button>
                              <button
                                onClick={() => setRejectModal(req.id)}
                                disabled={actionLoading === req.id}
                                className="px-3 py-1.5 text-xs font-body font-medium bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                Tolak
                              </button>
                            </>
                          )}
                          {req.status === "QUEUED" && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(req.id, "NOW_PLAYING")}
                                disabled={actionLoading === req.id}
                                className="px-3 py-1.5 text-xs font-body font-medium bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                Putar
                              </button>
                              <button
                                onClick={() => setRejectModal(req.id)}
                                disabled={actionLoading === req.id}
                                className="px-3 py-1.5 text-xs font-body font-medium bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                Tolak
                              </button>
                            </>
                          )}
                          {req.status === "NOW_PLAYING" && (
                            <button
                              onClick={() => handleStatusUpdate(req.id, "DONE")}
                              disabled={actionLoading === req.id}
                              className="px-3 py-1.5 text-xs font-body font-medium bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              Selesai
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setRejectModal(null);
              setRejectReason("");
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <button
              onClick={() => {
                setRejectModal(null);
                setRejectReason("");
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <FiX size={20} />
            </button>
            <h3 className="font-heading font-bold text-lg text-gray-900 mb-1">
              Tolak Request
            </h3>
            <p className="text-sm text-gray-500 font-body mb-4">
              Berikan alasan penolakan (opsional).
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Alasan penolakan..."
              className="w-full border border-gray-300 p-3 rounded-lg font-body text-sm text-gray-900 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason("");
                }}
                className="flex-1 py-2.5 border border-gray-300 rounded-full font-body font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading === rejectModal}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full font-body font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                Tolak Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
