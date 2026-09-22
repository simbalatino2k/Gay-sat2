import assert from 'node:assert/strict';
import { requestAllPermissionsOnLogin } from '../src/services/permissionsService';

const saved = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { value: { setItem: (k: string, v: string) => saved.set(k, v) }, configurable: true });
let locationCalls = 0;
let mediaCalls: any[] = [];
let stopped = 0;
let deny = false;
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
  geolocation: { getCurrentPosition: (ok: any) => { locationCalls++; ok({ coords: { latitude: 0, longitude: 8 } }); } },
  mediaDevices: { getUserMedia: async (constraints: any) => {
    mediaCalls.push(constraints);
    if (deny) throw Object.assign(new Error('Denied'), { name: 'NotAllowedError' });
    return { getTracks: () => [{ stop: () => stopped++ }] };
  } }
} });
await requestAllPermissionsOnLogin();
assert.equal(locationCalls, 0);
assert.equal(mediaCalls.length, 0);
const camera = await requestAllPermissionsOnLogin(null, undefined, { location: false, camera: true, microphone: false });
assert.deepEqual(mediaCalls, [{ video: true, audio: false }]);
assert.equal(camera.cameraGranted, true);
assert.equal(camera.microphoneGranted, false);
assert.equal(stopped, 1);
deny = true;
const denied = await requestAllPermissionsOnLogin(null, undefined, { location: false, camera: false, microphone: true });
assert.equal(denied.microphoneGranted, false);
assert.equal(mediaCalls.length, 2, 'Refusal must not trigger fallback prompts');
const location = await requestAllPermissionsOnLogin(null, undefined, { location: true, camera: false, microphone: false });
assert.equal(locationCalls, 1);
assert.deepEqual(location.coords, { lat: 0, lng: 8 });
assert.equal(mediaCalls.length, 2);
console.log('PASS: selected permissions only, no default sensor access, no retries after refusal, tracks released');
