// fetchWithTimeout.ts
// Wraps fetch with an AbortController so requests time out instead of hanging
// forever on a dead/unreachable network.

const DEFAULT_TIMEOUT_MS = 5000;

export const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
};

export default fetchWithTimeout;