const FIREBASE_HOSTED_ORIGINS = new Set([
  'auragay.com',
  'www.auragay.com',
  'aura-dating-gay-mab.web.app',
  'aura-dating-gay-mab.firebaseapp.com'
]);

// Firebase Hosting rewrites do not complete WebSocket upgrades. Keep signaling
// on AURA's own Cloud Run service; all other origins retain same-host routing.
const CLOUD_RUN_WEBSOCKET_HOST = 'aura-z6bppztrpa-nw.a.run.app';

export function auraWebSocketUrl(location: Pick<Location, 'protocol' | 'hostname' | 'host'>): string {
  if (FIREBASE_HOSTED_ORIGINS.has(location.hostname.toLowerCase())) {
    return `wss://${CLOUD_RUN_WEBSOCKET_HOST}/ws/webrtc`;
  }
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/ws/webrtc`;
}
