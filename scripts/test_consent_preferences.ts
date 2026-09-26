import assert from 'node:assert/strict';
import { store } from '../src/db/store';
import { defaultUserConsents, validateConsentPreferences } from '../src/lib/consentPreferences';

const defaults = defaultUserConsents();
assert.equal(defaults.aiAssistanceConsent, false);
assert.equal(defaults.explicitSpecialCategoryConsent, false);
assert.equal(defaults.locationProcessingConsent, false);
assert.equal(defaults.functionalCookies, false);
assert.equal(defaults.termsAcceptedVersion, '');
assert.equal(defaults.privacyPolicyAcceptedVersion, '');
for (const invalid of [null, [], 'yes', { aiAssistanceConsent: 'false' },
  { termsAcceptedVersion: '2026.1' }, { updatedAt: 'forged' }, { necessaryCookies: false }]) {
  assert.throws(() => validateConsentPreferences(invalid));
}
assert.deepEqual(validateConsentPreferences({ aiAssistanceConsent: false }), { aiAssistanceConsent: false });
const initial = await store.getUserConsents('isolated-consent-test');
assert.equal(initial.aiAssistanceConsent, false);
const enabled = await store.updateUserConsents('isolated-consent-test', { aiAssistanceConsent: true });
assert.equal(enabled.aiAssistanceConsent, true);
assert.equal(enabled.locationProcessingConsent, false);
await assert.rejects(store.updateUserConsents('isolated-consent-test', { aiAssistanceConsent: 'false' } as any));
assert.equal((await store.getUserConsents('isolated-consent-test')).aiAssistanceConsent, true);
const withdrawn = await store.updateUserConsents('isolated-consent-test', { aiAssistanceConsent: false });
assert.equal(withdrawn.aiAssistanceConsent, false);
assert.equal(withdrawn.termsAcceptedVersion, '');
console.log('PASS: no inferred consent, strict preferences, rejected fabricated acceptance, opt-in and withdrawal');
