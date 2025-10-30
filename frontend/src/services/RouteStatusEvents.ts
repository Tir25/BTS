// Lightweight cross-tab notifier so StudentMap can refresh without a hard reload

type RouteStatusMessage = { type: 'route-status-updated'; routeId: string; at: number };

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  try {
    if (!channel) channel = new BroadcastChannel('route-status-updates');
    return channel;
  } catch {
    return null;
  }
}

export function notifyRouteStatusUpdated(routeId: string) {
  const ch = getChannel();
  if (!ch) return;
  const msg: RouteStatusMessage = { type: 'route-status-updated', routeId, at: Date.now() };
  try { ch.postMessage(msg); } catch {}
}

export function onRouteStatusUpdated(handler: (routeId: string) => void): () => void {
  const ch = getChannel();
  if (!ch) return () => {};
  const listener = (ev: MessageEvent) => {
    const data = ev.data as RouteStatusMessage;
    if (data && data.type === 'route-status-updated' && data.routeId) {
      handler(data.routeId);
    }
  };
  ch.addEventListener('message', listener);
  return () => {
    try { ch.removeEventListener('message', listener); } catch {}
  };
}


