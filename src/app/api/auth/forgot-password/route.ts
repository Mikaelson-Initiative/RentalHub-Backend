import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { ok, catchError } from "@/lib/res";
import { forgotPasswordLimiter } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limited = forgotPasswordLimiter(req);
  if (limited) return limited;

  try {
    const { email } = await req.json();

    // Always return success to avoid leaking which emails are registered
    if (!email || typeof email !== "string") return ok({ sent: true });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user) {
      const token = randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: token, passwordResetExpiry: expiry },
      });

      await sendPasswordResetEmail(user.email, user.name, token);
    }

    return ok({ sent: true });
  } catch (e) {
    return catchError(e);
  }
}
