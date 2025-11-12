import { logger } from '../utils/logger';

// Lightweight cross-tab notifier so StudentMap can refresh without a hard reload
type RouteStatusMessage = { type: 'route-status-updated'; routeId: string; at: number };

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  try {
    if (!channel) {
      channel = new BroadcastChannel('route-status-updates');
    }
    return channel;
  } catch (error) {
    logger.warn('BroadcastChannel unavailable for route status updates.', 'route-status-events', { error });
    return null;
  }
}

export function notifyRouteStatusUpdated(routeId: string) {
  const ch = getChannel();
  if (!ch) {
    return;
  }
  const msg: RouteStatusMessage = { type: 'route-status-updated', routeId, at: Date.now() };
  try {
    ch.postMessage(msg);
  } catch (error) {
    logger.warn('Failed to post route status update message.', 'route-status-events', { error, routeId });
  }
}

export function onRouteStatusUpdated(handler: (routeId: string) => void): () => void {
  const ch = getChannel();
  if (!ch) {
    return () => undefined;
  }

  const listener = (event: MessageEvent<RouteStatusMessage>) => {
    const data = event.data;
    if (data?.type === 'route-status-updated' && data.routeId) {
      handler(data.routeId);
    }
  };

  ch.addEventListener('message', listener as EventListener);

  return () => {
    try {
      ch.removeEventListener('message', listener as EventListener);
    } catch (error) {
      logger.warn('Failed to detach route status listener.', 'route-status-events', { error });
    }
  };
}
