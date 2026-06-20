// lib/pusher.js
// Pusher server client singleton + helper untuk trigger event Live Chat.
//
// Channel naming convention (Live Chat):
//   - Public message channel: `chat-{roomId}`
//       Events: `new-message`, `message-deleted`, `guest-muted`
//   - Presence channel (listener counter): `presence-chat-{roomId}`
//       Authenticated via /api/live-chat/pusher/auth
import Pusher from "pusher";

const globalForPusher = global;

function createPusherServer() {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    return null;
  }

  return new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });
}

// Singleton — hindari membuat instance baru di setiap cold start serverless
export const pusherServer =
  globalForPusher.__pusherServer ?? createPusherServer();

if (process.env.NODE_ENV !== "production") {
  globalForPusher.__pusherServer = pusherServer;
}

export const CHAT_CHANNEL_PREFIX = "chat-";
export const BROADCAST_CHANNEL_PREFIX = "broadcast-";

export function chatChannelName(roomId) {
  return `${CHAT_CHANNEL_PREFIX}${roomId}`;
}

export function broadcastChannelName(broadcastId) {
  return `${BROADCAST_CHANNEL_PREFIX}${broadcastId}`;
}

export function isPusherConfigured() {
  return pusherServer !== null;
}

/**
 * Trigger satu atau lebih event ke channel chat room.
 * Gracefully no-op bila Pusher belum dikonfigurasi (mis. dev tanpa env),
 * agar fitur non-realtime tetap jalan.
 */
export async function triggerChatEvent(roomId, events) {
  if (!pusherServer) return;
  const channel = chatChannelName(roomId);
  const payload = Array.isArray(events)
    ? events.map((e) => ({ channel, ...e }))
    : [{ channel, ...events }];
  try {
    await pusherServer.triggerBatch(payload);
  } catch (err) {
    console.error("[pusher] triggerChatEvent failed:", err?.message || err);
  }
}

export async function triggerSongRequestEvent(broadcastId, events) {
  if (!pusherServer) return;
  const channel = broadcastChannelName(broadcastId);
  const payload = Array.isArray(events)
    ? events.map((e) => ({ channel, ...e }))
    : [{ channel, ...events }];
  try {
    await pusherServer.triggerBatch(payload);
  } catch (err) {
    console.error("[pusher] triggerSongRequestEvent failed:", err?.message || err);
  }
}
