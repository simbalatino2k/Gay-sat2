export const PERMISSIONS_PROMPTED_KEY = 'aura_permissions_prompted_once';

export function shouldRememberPermissionsChoice(
  result?: { locationGranted: boolean; locationSaved: boolean } | null
): boolean {
  // A GPS permission with a failed profile write still needs a retry after reload.
  return !result || !result.locationGranted || result.locationSaved;
}

export function isPaymentReturnLocation(pathname: string, search: string): boolean {
  return pathname.startsWith('/payment/') || pathname.startsWith('/boost/') || new URLSearchParams(search).has('payment');
}

export function shouldOfferPermissionsPrompt(
  hasResponded: boolean,
  hasRespondedOnAccount: boolean,
  pathname: string,
  search: string
): boolean {
  // A payment return should never be obscured by onboarding prompts.
  return !hasResponded && !hasRespondedOnAccount && !isPaymentReturnLocation(pathname, search);
}
