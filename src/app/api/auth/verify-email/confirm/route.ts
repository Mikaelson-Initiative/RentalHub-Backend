import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) return fail("Email and OTP are required");

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return fail("User not found", 404);

    const records = await prisma.emailOtp.findMany({
      where: { email, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    let matched = null;
    for (const r of records) {
      if (await bcrypt.compare(String(otp), r.codeHash)) { matched = r; break; }
    }
    if (!matched) return fail("Invalid or expired verification code", 401);

    await prisma.emailOtp.update({ where: { id: matched.id }, data: { usedAt: new Date() } });
    await prisma.user.update({ where: { email }, data: { emailVerified: true } });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    return ok({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, verificationStatus: user.verificationStatus },
    });
  } catch (e) {
    return catchError(e);
  }
}
