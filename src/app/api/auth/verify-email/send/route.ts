import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";
import { ok, fail, catchError } from "@/lib/res";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return fail("Email is required");

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return fail("User not found", 404);
    if (user.emailVerified) return fail("Email is already verified");

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.emailOtp.create({ data: { userId: user.id, email, codeHash, expiresAt } });
    await sendOtpEmail(email, user.name, otp);

    return ok({ message: "Verification code sent" });
  } catch (e) {
    return catchError(e);
  }
}
