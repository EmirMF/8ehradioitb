import Pusher from "pusher";
import {
  NewMessageEvent,
  MessageDeletedEvent,
  GuestMutedEvent,
  RoomStatusEvent,
} from "@/lib/live-chat/chat";

/**
 * Server-side Pusher client. Hanya dipanggil dari route handler (server),
 * tidak pernah di-import ke client component (secret tidak boleh bocor ke browser).
 *
 * Channel naming convention: `chat-room-{roomId}`
 * Event naming convention: lihat tiap fungsi di bawah.
 *
 * Untuk subscribe di client (Next.js client component), pakai pusher-js:
 *   const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER });
 *   const channel = pusher.subscribe(`chat-room-${roomId}`);
 *   channel.bind("new-message", (data) => { ... });
 */
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export function chatRoomChannel(roomId: string): string {
  return `chat-room-${roomId}`;
}

export async function broadcastNewMessage(roomId: string, payload: NewMessageEvent) {
  await pusherServer.trigger(chatRoomChannel(roomId), "new-message", payload);
}

export async function broadcastMessageDeleted(roomId: string, payload: MessageDeletedEvent) {
  await pusherServer.trigger(chatRoomChannel(roomId), "message-deleted", payload);
}

export async function broadcastGuestMuted(roomId: string, payload: GuestMutedEvent) {
  await pusherServer.trigger(chatRoomChannel(roomId), "guest-muted", payload);
}

export async function broadcastRoomStatus(roomId: string, payload: RoomStatusEvent) {
  await pusherServer.trigger(chatRoomChannel(roomId), "room-status", payload);
}
