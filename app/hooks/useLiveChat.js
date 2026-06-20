// app/hooks/useLiveChat.js
// Hook utama Live Chat: subscribe Pusher, kelola state pesan & listener count,
// expose aksi sendMessage.
//
// Dipakai oleh LiveChatPanel. Memerlukan guest session sudah ada (sessionId + roomId).
import { useState, useEffect, useRef, useCallback } from "react";
import { getPusherClient } from "@/app/hooks/usePusherClient";

/**
 * @param {{ roomId: string, sessionId: string, guestName: string } | null} session
 */
export function useLiveChat(session) {
  const [messages, setMessages] = useState([]);
  const [activeListeners, setActiveListeners] = useState(0);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [rateLimitedUntil, setRateLimitedUntil] = useState(0);
  const channelRef = useRef(null);
  const presenceRef = useRef(null);

  const roomId = session?.roomId;

  // ── Load history awal ────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/live-chat/${roomId}/messages`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (err) {
      console.error("[useLiveChat] loadHistory failed", err);
    }
  }, [roomId]);

  // ── Subscribe Pusher ─────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    const pusher = getPusherClient();
    loadHistory();

    // Fallback: polling stats setiap 15s
    let statsTimer;
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/live-chat/${roomId}/stats`);
        if (res.ok) {
          const data = await res.json();
          setActiveListeners(data.activeListeners ?? 0);
        }
      } catch {
        /* noop */
      }
    };
    fetchStats();
    statsTimer = setInterval(fetchStats, 15_000);

    // Fallback: polling messages setiap 5s bila Pusher tidak tersedia
    let msgTimer;
    if (!pusher) {
      msgTimer = setInterval(loadHistory, 5_000);
      return () => {
        clearInterval(statsTimer);
        clearInterval(msgTimer);
      };
    }

    const channel = pusher.subscribe(`chat-${roomId}`);
    channelRef.current = channel;

    channel.bind("pusher:subscription_succeeded", () => setConnected(true));
    channel.bind("pusher:subscription_error", () => {
      setConnected(false);
      setError("Gagal terhubung ke chat real-time.");
    });

    channel.bind("new-message", (msg) => {
      setMessages((prev) => {
        // hindari duplikat (bisa terjadi bila optimistik)
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    channel.bind("message-deleted", ({ msgId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, isDeleted: true, content: "" }
            : m,
        ),
      );
    });

    channel.bind("guest-muted", ({ sessionId: mutedSessionId }) => {
      // Jika guest sendiri yang di-mute, beri sinyal via event global
      if (session?.sessionId === mutedSessionId) {
        window.dispatchEvent(
          new CustomEvent("liveChat:localMuted", {
            detail: { sessionId: mutedSessionId },
          }),
        );
      }
    });

    // Presence channel untuk counter listener
    const presence = pusher.subscribe(`presence-chat-${roomId}`);
    presenceRef.current = presence;
    const updateCount = (members) => {
      setActiveListeners(members?.count ?? 0);
    };
    presence.bind("pusher:subscription_succeeded", updateCount);
    presence.bind("pusher:member_added", () =>
      presence.members && updateCount(presence.members),
    );
    presence.bind("pusher:member_removed", () =>
      presence.members && updateCount(presence.members),
    );

    return () => {
      clearInterval(statsTimer);
      channel.unbind_all();
      presence.unbind_all();
      pusher.unsubscribe(`chat-${roomId}`);
      pusher.unsubscribe(`presence-chat-${roomId}`);
      channelRef.current = null;
      presenceRef.current = null;
      setConnected(false);
    };
  }, [roomId, loadHistory, session?.sessionId]);

  // ── Listen local mute event ──────────────────────────
  useEffect(() => {
    if (!session?.sessionId) return;
    const handler = () => setError("Kamu telah di-mute oleh moderator.");
    window.addEventListener("liveChat:localMuted", handler);
    return () => window.removeEventListener("liveChat:localMuted", handler);
  }, [session?.sessionId]);

  // ── Send message ─────────────────────────────────────
  const sendMessage = useCallback(
    async (content) => {
      if (!roomId) return { ok: false };
      const trimmed = content.trim();
      if (!trimmed) return { ok: false, error: "Pesan tidak boleh kosong." };

      // Cooldown rate limit di sisi client
      if (Date.now() < rateLimitedUntil) {
        const secs = Math.ceil((rateLimitedUntil - Date.now()) / 1000);
        return {
          ok: false,
          error: `Tunggu ${secs} detik sebelum kirim pesan lagi.`,
        };
      }

      try {
        const res = await fetch(`/api/live-chat/${roomId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmed }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.status === 429) {
          const retryMs = data.retryAfterMs || 60_000;
          setRateLimitedUntil(Date.now() + retryMs);
          return { ok: false, error: data.error || "Terlalu banyak pesan." };
        }
        if (!res.ok) {
          return { ok: false, error: data.error || "Gagal mengirim pesan." };
        }

        // Optimistik: tambahkan pesan ke state bila Pusher belum mengirimnya
        if (data.message) {
          setMessages((prev) =>
            prev.some((m) => m.id === data.message.id)
              ? prev
              : [...prev, data.message],
          );
        }
        return { ok: true };
      } catch (err) {
        return { ok: false, error: "Gagal terhubung ke server." };
      }
    },
    [roomId, rateLimitedUntil],
  );

  return {
    messages,
    activeListeners,
    connected,
    error,
    sendMessage,
    reload: loadHistory,
  };
}
