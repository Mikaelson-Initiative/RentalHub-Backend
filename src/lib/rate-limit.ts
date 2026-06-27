import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

// Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env
const redis = Redis.fromEnv();

/**
 * Extract the real client IP securely.
 *
 * Attack surface: a client can inject arbitrary values into x-forwarded-for
 * by setting it before the request reaches any trusted proxy. Vercel's edge
 * network APPENDS the real IP as the last entry and also sets x-real-ip —
 * both are injected by infrastructure, not the client.
 *
 * Rule: trust x-real-ip first (Vercel sets it), then take the LAST
 * x-forwarded-for entry (added by Vercel's edge), never the first.
 */
function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ??
    "unknown"
  );
}

function makeChecker(limiter: Ratelimit) {
  return async function check(req: NextRequest): Promise<NextResponse | null> {
    const ip = getIp(req);
    const { success, limit, remaining, reset } = await limiter.limit(ip);

    if (!success) {
      const retryAfter = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
      return new NextResponse(
        JSON.stringify({ success: false, error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(Math.ceil(reset / 1000)),
          },
        }
      );
    }

    return null;
  };
}

export const forgotPasswordLimiter = makeChecker(
  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 h"), prefix: "rl:fp" })
);

export const loginLimiter = makeChecker(
  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "15 m"), prefix: "rl:login" })
);

// 10 OTP attempts per IP per 15 minutes — prevents brute-forcing 6-digit codes (10^6 space).
export const otpLimiter = makeChecker(
  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "15 m"), prefix: "rl:otp" })
);

// 5 booking creations per IP per hour — prevents booking-spam / fee manipulation loops.
export const bookingLimiter = makeChecker(
  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 h"), prefix: "rl:booking" })
);

// 10 inspection requests per IP per hour — prevents inspection request flooding.
export const inspectionLimiter = makeChecker(
  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 h"), prefix: "rl:inspection" })
);
