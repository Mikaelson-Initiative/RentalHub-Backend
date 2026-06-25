import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function getAuth(req: NextRequest): TokenPayload | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(header.slice(7), JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: NextRequest, ...roles: string[]): TokenPayload {
  const auth = getAuth(req);
  if (!auth) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  if (roles.length && !roles.includes(auth.role))
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  return auth;
}
