import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";
import { ok, fail, catchError } from "@/lib/res";
import { RegisterSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = RegisterSchema.safeParse(body);
    if (!result.success) {
      return fail(result.error.issues[0].message, 400);
    }
    
    const { name, email, password, role } = result.data;

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) return fail("Email already registered", 409);

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name: name.trim(), email: normalizedEmail, password: hashed, role },
    });

    await sendOtp(user.id, normalizedEmail, user.name);

    return ok({ message: "Registration successful. Check your email for the verification code." }, 201);
  } catch (e) {
    return catchError(e);
  }
}

async function sendOtp(userId: string, email: string, name: string) {
  const otp = String(randomInt(100000, 1000000));
  const codeHash = await bcrypt.hash(otp, 12);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await prisma.emailOtp.create({ data: { userId, email, codeHash, expiresAt } });
  await sendOtpEmail(email, name, otp);
}
