const RANDOM_JOKE_URL = "https://official-joke-api.appspot.com/random_joke";
const REQUEST_TIMEOUT_MS = 8000;

export type Joke = {
  id: number;
  type: string;
  setup: string;
  punchline: string;
};

export type JokeErrorReason =
  | "timeout"
  | "network"
  | "http"
  | "invalid_response";

export class JokeApiError extends Error {
  readonly reason: JokeErrorReason;
  readonly status?: number;

  constructor(reason: JokeErrorReason, status?: number) {
    super(`Joke API request failed: ${reason}${status ? ` (${status})` : ""}`);
    this.reason = reason;
    this.status = status;
  }
}

function isJoke(value: unknown): value is Joke {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "number" &&
    typeof v.type === "string" &&
    typeof v.setup === "string" &&
    typeof v.punchline === "string"
  );
}

export async function fetchRandomJoke(signal?: AbortSignal): Promise<Joke> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener("abort", forwardAbort);

  try {
    const response = await fetch(RANDOM_JOKE_URL, {
      signal: controller.signal,
      headers: { Accept: "application/json", "Cache-Control": "no-cache" },
    });
    if (!response.ok) {
      throw new JokeApiError("http", response.status);
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new JokeApiError("invalid_response");
    }
    if (!isJoke(body)) {
      throw new JokeApiError("invalid_response");
    }
    return {
      id: body.id,
      type: body.type,
      setup: body.setup,
      punchline: body.punchline,
    };
  } catch (error) {
    if (error instanceof JokeApiError || signal?.aborted) {
      throw error;
    }
    throw new JokeApiError(timedOut ? "timeout" : "network");
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", forwardAbort);
  }
}
