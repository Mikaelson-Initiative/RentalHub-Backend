import { NextRequest, NextResponse } from "next/server";

// ALLOWED_ORIGINS accepts a comma-separated list, e.g.:
// "https://rentalhub.ng,https://www.rentalhub.ng,https://hazard.rentalhub.ng"
// Falls back to the legacy single FRONTEND_URL var if ALLOWED_ORIGINS isn't set.
const PROD_ORIGINS = (
  process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || ""
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string): boolean {
  if (PROD_ORIGINS.includes(origin)) return true;
  // Allow any localhost or 127.0.0.1 port in development
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function corsHeaders(origin: string) {
  const allowed = isAllowedOrigin(origin) ? origin : (PROD_ORIGINS[0] ?? "");
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }

  const res = NextResponse.next();
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export const config = { matcher: "/api/:path*" };
