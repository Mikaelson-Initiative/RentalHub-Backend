import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";
import { loginLimiter } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limited = await loginLimiter(req);
  if (limited) return limited;

  try {
    const { email, password } = await req.json();
    if (!email || !password) return fail("Email and password are required");

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return fail("Invalid email or password", 401);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return fail("Invalid email or password", 401);

    if (!user.emailVerified)
      return fail("Please verify your email before logging in", 403);

    if (user.isFrozen)
      return fail("Your account has been suspended. Contact support for assistance.", 403);

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    return ok({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        verificationStatus: user.verificationStatus,
        campus: user.campus,
      },
    });
  } catch (e) {
    return catchError(e);
  }
}
