import { fetchWithRetry } from "@/lib/self-healing-fetch";

describe("fetchWithRetry", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("retries transient HTTP statuses and succeeds", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response("upstream error", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const response = await fetchWithRetry("https://example.com/api", {}, { retries: 1, retryDelayMs: 1 });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry on client errors", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response("bad request", { status: 400 }));

    const response = await fetchWithRetry("https://example.com/api", {}, { retries: 2, retryDelayMs: 1 });

    expect(response.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
