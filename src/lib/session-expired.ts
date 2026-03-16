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

export const SESSION_EXPIRED_ERROR = ERROR_PARAM;

export function isSessionExpiredError(error: string | null): boolean {
  return error === ERROR_PARAM;
}

/**
 * Call this after a fetch to a protected endpoint. If response is 401/403,
 * redirects to sign-in (session expired). Returns true if redirected.
 */
export function redirectIfUnauthorized(response: Response): boolean {
  if ((response.status === 401 || response.status === 403) && typeof window !== "undefined") {
    redirectToSignInSessionExpired();
    return true;
  }
  return false;
}
