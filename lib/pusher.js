import Pusher from "pusher";

function getPusherConfig() {
  const appId = process.env.PUSHER_APP_ID?.trim();
  const key = process.env.PUSHER_KEY?.trim();
  const secret = process.env.PUSHER_SECRET?.trim();
  const cluster = process.env.PUSHER_CLUSTER?.trim();

  if (!appId || !key || !secret || !cluster) return null;

  return { appId, key, secret, cluster };
}

const config = getPusherConfig();

export const pusherServer = config
  ? new Pusher({
      ...config,
      useTLS: true,
    })
  : null;

export async function publishNowPlaying(payload) {
  if (!pusherServer) return;
  await pusherServer.trigger("now-playing", "updated", payload);
}
