/**
 * Central handling for session expiry. When the server returns 401/403,
 * redirect to sign-in with a clear message and force full reload so the
 * user is not stuck on a stale view.
 */

const SIGNIN_PATH = "/auth/signin";
const ERROR_PARAM = "SessionExpired";

export function redirectToSignInSessionExpired(): void {
  if (typeof window === "undefined") return;
  const callbackUrl = encodeURIComponent(
    window.location.pathname + window.location.search
  );
  const url = `${SIGNIN_PATH}?error=${ERROR_PARAM}&callbackUrl=${callbackUrl}`;
  window.location.replace(url);
}

export function isSessionExpiredError(error: string | null): boolean {
  return error === ERROR_PARAM;
}
