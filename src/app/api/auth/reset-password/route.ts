import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { ok, fail, catchError } from "@/lib/res";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) return fail("Token and password are required");
    if (typeof password !== "string" || password.length < 8) return fail("Password must be at least 8 characters");
    if (password.length > 72) return fail("Password must be at most 72 characters");

    const tokenHash = createHash("sha256").update(String(token)).digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpiry: { gt: new Date() },
      },
    });

    if (!user) return fail("Reset link is invalid or has expired", 400);

    const hashed = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, passwordResetToken: null, passwordResetExpiry: null },
    });

    return ok({ message: "Password updated successfully" });
  } catch (e) {
    return catchError(e);
  }
}
