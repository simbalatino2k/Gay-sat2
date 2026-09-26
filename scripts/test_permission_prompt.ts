import assert from 'node:assert/strict';
import { shouldOfferPermissionsPrompt } from '../src/lib/permissionsPrompt';
import { requestAllPermissionsOnLogin } from '../src/services/permissionsService';

async function main() {
  assert.equal(shouldOfferPermissionsPrompt(false, false, '/', ''), true);
  assert.equal(shouldOfferPermissionsPrompt(true, false, '/', ''), false);
  assert.equal(shouldOfferPermissionsPrompt(false, true, '/', ''), false);
  assert.equal(shouldOfferPermissionsPrompt(false, false, '/', '?payment=unverified'), false);
  assert.equal(shouldOfferPermissionsPrompt(false, false, '/payment/confirmation', ''), false);

  let locationRequests = 0;
  let mediaRequests = 0;
  let stoppedTracks = 0;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      geolocation: {
        getCurrentPosition: () => { locationRequests++; }
      },
      mediaDevices: {
        getUserMedia: async ({ video, audio }: { video: boolean; audio: boolean }) => {
          assert.equal(video, true);
          assert.equal(audio, false);
          mediaRequests++;
          return { getTracks: () => [{ stop: () => { stoppedTracks++; } }] };
        }
      }
    }
  });

  const skipped = await requestAllPermissionsOnLogin(null);
  assert.equal(skipped.locationGranted, false);
  assert.equal(skipped.cameraGranted, false);
  assert.equal(skipped.microphoneGranted, false);
  assert.equal(locationRequests, 0);
  assert.equal(mediaRequests, 0);

  const cameraOnly = await requestAllPermissionsOnLogin(null, undefined, {
    location: false,
    camera: true,
    microphone: false
  });
  assert.equal(cameraOnly.cameraGranted, true);
  assert.equal(cameraOnly.microphoneGranted, false);
  assert.equal(locationRequests, 0);
  assert.equal(mediaRequests, 1);
  assert.equal(stoppedTracks, 1);
  console.log('Permission prompt checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
