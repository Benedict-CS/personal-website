type RetryOptions = {
  retries?: number;
  timeoutMs?: number;
  retryDelayMs?: number;
  retryStatuses?: number[];
};

const DEFAULT_RETRY_STATUSES = [408, 425, 429, 500, 502, 503, 504];
export const EXTERNAL_INTEGRATION_RETRY_POLICY: Required<RetryOptions> = {
  retries: 2,
  timeoutMs: 5000,
  retryDelayMs: 180,
  retryStatuses: DEFAULT_RETRY_STATUSES,
};

/** Same-origin dashboard calls: tolerate brief API/DB hiccups without surfacing flaky errors. */
export const DASHBOARD_INTERNAL_FETCH: Required<RetryOptions> = {
  retries: 2,
  timeoutMs: 20000,
  retryDelayMs: 200,
  retryStatuses: DEFAULT_RETRY_STATUSES,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Performs fetch with bounded retries for transient upstream failures.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  const retries = options.retries ?? 2;
  const timeoutMs = options.timeoutMs ?? 3500;
  const retryDelayMs = options.retryDelayMs ?? 160;
  const retryStatuses = new Set(options.retryStatuses ?? DEFAULT_RETRY_STATUSES);

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (attempt < retries && retryStatuses.has(response.status)) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }
      return response;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt >= retries) break;
      await sleep(retryDelayMs * (attempt + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Failed to fetch from upstream.");
}

/**
 * Operator-facing copy when fetchWithRetry exhausts retries (timeout, network, or non-retryable failure).
 */
export function formatDashboardFetchFailure(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "The request timed out after automatic retries. Check your connection and use Retry on this page.";
  }
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return "The request timed out after automatic retries. Check your connection and use Retry on this page.";
    }
    const base = error.message.trim();
    if (!base) {
      return "Something went wrong after automatic retries. Try again shortly.";
    }
    return `${base} If this keeps happening, wait a moment and try again.`;
  }
  return "Request failed after automatic retries. Try again shortly.";
}

/**
 * Standardized JSON helper with retry + timeout for external APIs.
 * Throws when response is non-OK or payload is invalid JSON.
 */
export async function fetchJsonWithRetry<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RetryOptions = EXTERNAL_INTEGRATION_RETRY_POLICY
): Promise<{ response: Response; data: T }> {
  const response = await fetchWithRetry(input, init, options);
  if (!response.ok) {
    throw new Error(`Upstream returned ${response.status}`);
  }
  const data = (await response.json()) as T;
  return { response, data };
}
