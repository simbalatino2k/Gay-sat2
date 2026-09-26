import assert from 'node:assert/strict';
import { ADS_CONFIG, getAdConsent, saveAdConsent, AD_CONSENT_STORAGE_KEY } from '../src/config/adsConfig';
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
  assert.equal(ADS_CONFIG.TELEMETRY_SAMPLE_RATE, 0, 'No paid ad partner is active');
  assert.equal(getAdConsent().allowAnalytics, false);
  await sendAdEvent('ad_click', 'discover', 'test', true);
  assert.equal(requests.length, 0, 'No telemetry before a choice');
  saveAdConsent({ consentGiven: true, allowPersonalizedAds: true, allowAnalytics: false });
  assert.equal(getAdConsent().allowPersonalizedAds, true, 'Preferences can be saved independently');
  await sendAdEvent('ad_click', 'discover', 'test', true);
  assert.equal(requests.length, 0, 'Personalization is not analytics consent');
  saveAdConsent({ consentGiven: true, allowPersonalizedAds: false, allowAnalytics: true });
  assert.equal(getAdConsent().allowPersonalizedAds, false, 'Personalization can be withdrawn');
  assert.equal(getAdConsent().allowAnalytics, true, 'Analytics preference is separate');
  await sendAdEvent('ad_click', 'discover', 'test', true);
  assert.equal(requests.length, 0, 'Disabled ad telemetry stays off even with stored consent');
  saveAdConsent({ allowAnalytics: false });
  assert.equal(getAdConsent().allowAnalytics, false, 'Analytics consent can be withdrawn');
  await sendAdEvent('ad_click', 'discover', 'test', false);
  assert.equal(requests.length, 0, 'Withdrawal takes effect immediately');
  storage.set(AD_CONSENT_STORAGE_KEY, 'invalid json');
  assert.equal(getAdConsent().allowAnalytics, false, 'Corrupt preferences fail closed');
  await sendAdEvent('ad_click', 'discover', 'test', false);
  assert.equal(requests.length, 0, 'Corrupt preferences cannot emit telemetry');
  console.log('PASS: disabled telemetry, independent preferences, withdrawal and corrupt preferences');
}
await run();
