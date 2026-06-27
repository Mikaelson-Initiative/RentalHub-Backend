import { NextRequest } from "next/server";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { ok, catchError } from "@/lib/res";
import { forgotPasswordLimiter } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limited = await forgotPasswordLimiter(req);
  if (limited) return limited;

  try {
    const { email } = await req.json();

    // Always return success to avoid leaking which emails are registered
    if (!email || typeof email !== "string") return ok({ sent: true });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: tokenHash, passwordResetExpiry: expiry },
      });

      await sendPasswordResetEmail(user.email, user.name, token);
    }

    return ok({ sent: true });
  } catch (e) {
    return catchError(e);
  }
}
