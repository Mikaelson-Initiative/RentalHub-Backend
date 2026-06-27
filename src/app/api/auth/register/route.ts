import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";
import { ok, fail, catchError } from "@/lib/res";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role)
      return fail("Name, email, password, and role are required");

    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80)
      return fail("Name must be between 2 and 80 characters");

    if (typeof email !== "string" || !EMAIL_RE.test(email))
      return fail("Enter a valid email address");

    if (typeof password !== "string" || password.length < 8 || password.length > 72)
      return fail("Password must be between 8 and 72 characters");

    const normalizedRole = (role as string).toUpperCase();
    if (!["STUDENT", "LANDLORD"].includes(normalizedRole))
      return fail("Role must be STUDENT or LANDLORD");

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) return fail("Email already registered", 409);

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name: name.trim(), email: normalizedEmail, password: hashed, role: normalizedRole as "STUDENT" | "LANDLORD" },
    });

    await sendOtp(user.id, normalizedEmail, user.name);

    return ok({ message: "Registration successful. Check your email for the verification code." }, 201);
  } catch (e) {
    return catchError(e);
  }
}

async function sendOtp(userId: string, email: string, name: string) {
  const otp = String(randomInt(100000, 1000000));
  const codeHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await prisma.emailOtp.create({ data: { userId, email, codeHash, expiresAt } });
  await sendOtpEmail(email, name, otp);
}
