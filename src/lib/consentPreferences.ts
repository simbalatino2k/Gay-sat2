import type { UserConsents } from '../types';

export function defaultUserConsents(): UserConsents {
  return {
    necessaryCookies: true,
    functionalCookies: false,
    analyticsCookies: false,
    explicitSpecialCategoryConsent: false,
    aiAssistanceConsent: false,
    locationProcessingConsent: false,
    termsAcceptedVersion: '',
    privacyPolicyAcceptedVersion: '',
    updatedAt: new Date().toISOString(),
    safeContentEnabled: true
  };
}

// Policy acceptance requires its own versioned flow; a preferences payload must
// never manufacture acceptance evidence or supply its own timestamp.
export function validateConsentPreferences(input: unknown): Partial<UserConsents> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid consent preferences');
  const allowed = new Set(['functionalCookies', 'analyticsCookies', 'explicitSpecialCategoryConsent',
    'aiAssistanceConsent', 'locationProcessingConsent', 'safeContentEnabled']);
  const result: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.has(key) || typeof value !== 'boolean') throw new Error('Invalid consent preference: ' + key);
    result[key] = value;
  }
  return result;
}
