"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { FiTrash2, FiVolumeX, FiVolume2, FiRefreshCw, FiUsers } from "react-icons/fi";
import { hasAnyRole } from "@/lib/roleUtils";

export default function LiveChatDashboardPage() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState([]);
  const [activeListeners, setActiveListeners] = useState(0);
  const [activeGuests, setActiveGuests] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [mutedList, setMutedList] = useState([]);

  const isAdmin =
    session && hasAnyRole(session.user.role, ["DEVELOPER", "TECHNIC"]);

  // Connect to SSE stream
  useEffect(() => {
    if (!isAdmin) return;

    // Fetch existing messages
    fetch("/api/chat/messages")
      .then((res) => res.json())
      .then((data) => {
        if (data.messages && data.messages.length > 0) {
          setMessages(
            data.messages.map((m) => ({
              ...m,
              deleted: m.deleted || false,
            }))
          );
        }
      })
      .catch((err) => console.error("Gagal memuat riwayat pesan:", err));

    const sessionId = "admin-dashboard-" + Date.now();
    const eventSource = new EventSource(
      `/api/chat/stream?sessionId=${sessionId}&name=Admin`
    );

    eventSource.onopen = () => setIsConnected(true);

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);

        if (parsed.type === "delete_message") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === parsed.messageId
                ? { ...m, deleted: true }
                : m
            )
          );
          return;
        }

        if (parsed.type === "system_event") {
          setActiveListeners(parsed.activeListeners || 0);
          setActiveGuests(parsed.activeGuests || []);
          return;
        }

        const messageData =
          parsed.type === "new_message" ? parsed.message : parsed;
        if (!messageData || !messageData.text) return;

        setMessages((prev) => {
          if (prev.some((m) => m.id === messageData.id)) return prev;
          return [...prev, { ...messageData, deleted: false }];
        });
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    eventSource.onerror = () => setIsConnected(false);

    return () => eventSource.close();
  }, [isAdmin]);

  const handleDeleteMessage = useCallback(async (messageId) => {
    try {
      await fetch(`/api/chat/delete?id=${messageId}`, { method: "DELETE" });
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }, []);

  const handleMute = useCallback(async (guestSessionId, guestName) => {
    if (!confirm(`Mute "${guestName}"? User ini tidak akan bisa mengirim pesan.`)) return;
    try {
      await fetch("/api/chat/mute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: guestSessionId, action: "mute" }),
      });
      setMutedList((prev) => [...prev, guestSessionId]);
    } catch (err) {
      console.error("Mute failed:", err);
    }
  }, []);

  const handleUnmute = useCallback(async (guestSessionId) => {
    try {
      await fetch("/api/chat/mute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: guestSessionId, action: "unmute" }),
      });
      setMutedList((prev) => prev.filter((id) => id !== guestSessionId));
    } catch (err) {
      console.error("Unmute failed:", err);
    }
  }, []);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (status === "loading") {
    return <div className="p-8 text-center font-body">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center font-body text-red-600">
        Access Denied.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-gray-800">
          Live Chat
        </h1>
        <p className="text-gray-600 font-body mt-1">
          Monitor dan moderasi pesan live chat secara real-time.
        </p>
      </div>

      {/* Status Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-body font-medium ${
            isConnected
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
            }`}
          />
          {isConnected ? "Terhubung" : "Terputus"}
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-body font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <FiUsers size={14} />
          {activeListeners} Online
        </div>
        <div className="text-sm font-body text-gray-500">
          {messages.filter((m) => !m.deleted).length} pesan
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages Panel */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-200 flex flex-col" style={{ maxHeight: "600px" }}>
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-heading font-semibold text-gray-800">
              Pesan Masuk
            </h2>
            <span className="text-xs text-gray-400 font-body">Real-time</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10 font-body">
                Belum ada pesan masuk.
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    msg.deleted
                      ? "bg-gray-50 border-gray-100 opacity-60"
                      : "bg-white border-gray-100 hover:bg-gray-50"
                  } transition-colors group`}
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {msg.senderName?.charAt(0).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-gray-800 font-body">
                        {msg.senderName}
                      </span>
                      <span className="text-[10px] text-gray-400 font-body">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    {msg.deleted ? (
                      <p className="text-sm text-gray-400 italic font-body">
                        Pesan ini dihapus oleh moderator
                      </p>
                    ) : (
                      <p className="text-sm text-gray-700 font-body break-words">
                        {msg.text}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {!msg.deleted && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all rounded-md hover:bg-red-50"
                      title="Hapus pesan"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Guests Panel */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col" style={{ maxHeight: "600px" }}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-heading font-semibold text-gray-800">
              Tamu Aktif
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {activeGuests.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10 font-body">
                Belum ada tamu aktif.
              </p>
            ) : (
              activeGuests.map((guest, idx) => {
                const isMuted = mutedList.includes(guest.sessionId);
                return (
                  <div
                    key={`${guest.sessionId}-${idx}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 font-body truncate">
                        {guest.name}
                      </p>
                      <p
                        className="text-[10px] text-gray-400 font-body truncate"
                        title={guest.sessionId}
                      >
                        {guest.sessionId.slice(0, 12)}...
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        isMuted
                          ? handleUnmute(guest.sessionId)
                          : handleMute(guest.sessionId, guest.name)
                      }
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        isMuted
                          ? "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200"
                          : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                      }`}
                      title={isMuted ? "Unmute user" : "Mute user"}
                    >
                      {isMuted ? (
                        <>
                          <FiVolume2 size={12} /> Unmute
                        </>
                      ) : (
                        <>
                          <FiVolumeX size={12} /> Mute
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
