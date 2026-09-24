import assert from 'node:assert/strict';
import { mediaSessionTokens } from '../src/lib/mediaSessionCookies';
import { auraWebSocketUrl } from '../src/lib/websocketEndpoint';

assert.deepEqual(
  mediaSessionTokens('aura_token=old%2Ftoken; __session=new%2Ftoken; aura_auth_token=older'),
  ['new/token']
);
assert.deepEqual(mediaSessionTokens('__session=expired; aura_token=active-old-account'), ['expired']);
assert.deepEqual(mediaSessionTokens('__session=%GG; aura_token=legacy'), []);
assert.deepEqual(mediaSessionTokens('__session=; aura_token=legacy'), []);
assert.deepEqual(mediaSessionTokens('aura_auth_token=legacy-new; aura_token=legacy-old'), ['legacy-new', 'legacy-old']);
assert.deepEqual(mediaSessionTokens('other=x'), []);

const location = (host: string, protocol = 'https:') => ({
  protocol,
  hostname: host.split(':')[0],
  host
});
const direct = 'wss://aura-z6bppztrpa-nw.a.run.app/ws/webrtc';
assert.equal(auraWebSocketUrl(location('auragay.com')), direct);
assert.equal(auraWebSocketUrl(location('www.auragay.com')), direct);
assert.equal(auraWebSocketUrl(location('aura-dating-gay-mab.web.app')), direct);
assert.equal(auraWebSocketUrl(location('aura-dating-gay-mab.firebaseapp.com')), direct);
assert.equal(auraWebSocketUrl(location('aura-studio-4975.ai.studio')), 'wss://aura-studio-4975.ai.studio/ws/webrtc');
assert.equal(auraWebSocketUrl(location('localhost:3000', 'http:')), 'ws://localhost:3000/ws/webrtc');

console.log('Domain session and WebSocket routing: PASS');
