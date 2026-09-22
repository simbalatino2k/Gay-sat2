import assert from 'node:assert/strict';
import { getAdConsent, saveAdConsent, AD_CONSENT_STORAGE_KEY } from '../src/config/adsConfig';
import { sendAdEvent } from '../src/services/adTelemetry';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value)
}});
const requests: any[] = [];
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
globalThis.fetch = async (_url, init) => {
  requests.push(JSON.parse(String(init?.body)));
  return new Response(null, { status: 204 });
};

async function run() {
  assert.equal(getAdConsent().allowAnalytics, false);
  await sendAdEvent('ad_click', 'discover', 'test', true);
  assert.equal(requests.length, 0, 'No telemetry before a choice');
  saveAdConsent({ consentGiven: true, allowPersonalizedAds: true, allowAnalytics: false });
  await sendAdEvent('ad_click', 'discover', 'test', true);
  assert.equal(requests.length, 0, 'Personalization is not analytics consent');
  saveAdConsent({ consentGiven: true, allowPersonalizedAds: false, allowAnalytics: true });
  await sendAdEvent('ad_click', 'discover', 'test', true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].isPersonalized, false);
  saveAdConsent({ allowAnalytics: false });
  await sendAdEvent('ad_click', 'discover', 'test', false);
  assert.equal(requests.length, 1, 'Withdrawal takes effect immediately');
  storage.set(AD_CONSENT_STORAGE_KEY, 'invalid json');
  await sendAdEvent('ad_click', 'discover', 'test', false);
  assert.equal(requests.length, 1, 'Corrupt preferences fail closed');
  console.log('PASS: analytics default, independent consent, withdrawal and corrupt preferences');
}
await run();
