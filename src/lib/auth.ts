import "server-only";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { algorithm: "HS256", expiresIn: "2h" });
}

export function getAuth(req: NextRequest): TokenPayload | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(header.slice(7), JWT_SECRET, { algorithms: ["HS256"] }) as TokenPayload;
  } catch {
    return null;
  }
}

export async function requireAuth(req: NextRequest, ...roles: string[]): Promise<TokenPayload> {
  const auth = getAuth(req);
  if (!auth) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  if (roles.length && !roles.includes(auth.role))
    throw Object.assign(new Error("Forbidden"), { status: 403 });

  // Check if user is frozen/banned
  const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { isFrozen: true } });
  if (!user) throw Object.assign(new Error("User not found"), { status: 401 });
  if (user.isFrozen) throw Object.assign(new Error("Your account has been frozen"), { status: 403 });

  return auth;
}

// Verifies role=INSPECTOR. Routes that additionally need verificationStatus=VERIFIED
// must check the DB themselves after calling this, e.g.:
//   const inspector = await prisma.user.findUnique({ where: { id: auth.userId }, select: { verificationStatus: true } });
//   if (inspector?.verificationStatus !== "VERIFIED") return fail("Inspector account not yet verified.", 403);
export async function requireVerifiedInspector(req: NextRequest): Promise<TokenPayload> {
  return await requireAuth(req, "INSPECTOR");
}
