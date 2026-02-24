/** Common API error response */
export type ApiError = { error: string };

/** Health check response body */
export type HealthResponse = { ok: boolean; db: "ok" | "error"; version?: string };
