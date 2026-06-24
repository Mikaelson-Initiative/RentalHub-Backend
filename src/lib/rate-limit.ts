import { NextRequest, NextResponse } from "next/server";

interface Window {
  count: number;
  resetAt: number;
}

// In-memory store — resets on cold start (acceptable for serverless; keeps Neon-free stack)
const store = new Map<string, Window>();

/** Purge expired windows to prevent unbounded memory growth. */
function prune() {
  const now = Date.now();
  for (const [key, win] of store) {
    if (win.resetAt < now) store.delete(key);
  }
}

export function rateLimit(opts: { limit: number; windowMs: number }) {
  return function check(req: NextRequest): NextResponse | null {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const key = `${req.nextUrl.pathname}:${ip}`;
    const now = Date.now();

    // Prune ~1% of calls to avoid O(n) on every request
    if (Math.random() < 0.01) prune();

    const win = store.get(key);
    if (!win || win.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + opts.windowMs });
      return null; // allowed
    }

    win.count += 1;
    if (win.count > opts.limit) {
      const retryAfter = Math.ceil((win.resetAt - now) / 1000);
      return new NextResponse(
        JSON.stringify({ success: false, error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(opts.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(win.resetAt / 1000)),
          },
        }
      );
    }

    return null; // allowed
  };
}

export const forgotPasswordLimiter = rateLimit({ limit: 5, windowMs: 60 * 60 * 1000 });
export const loginLimiter = rateLimit({ limit: 5, windowMs: 15 * 60 * 1000 });
