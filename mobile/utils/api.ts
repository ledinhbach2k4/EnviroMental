export const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  retries = 2, // Giảm số lần thử lại còn 2 (tổng cộng 3 lần gọi)
): Promise<Response> => {
  for (let i = 0; i <= retries; i++) {
    if (i > 0) {
      // Tăng thời gian chờ tối thiểu và tối đa
      const backoff = Math.min(2000 * 2 ** (i - 1), 10000); // Chờ 2s, 4s, ..., max 10s
      const delay = backoff + Math.random() * 500; // Thêm jitter
      console.log(
        `[${new Date().toISOString()}] Rate limited (429). Retrying in ${Math.round(
          delay / 1000
        )}s... (Attempt ${i})`
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const res = await fetch(url, options);
    if (res.status !== 429) {
      return res;
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries due to rate limiting.`);
};