import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";
import { ok, fail, catchError } from "@/lib/res";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role)
      return fail("Name, email, password, and role are required");

    const normalizedRole = role.toUpperCase();
    if (!["STUDENT", "LANDLORD"].includes(normalizedRole))
      return fail("Role must be STUDENT or LANDLORD");

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return fail("Email already registered", 409);

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: normalizedRole as "STUDENT" | "LANDLORD" },
    });

    await sendOtp(user.id, email, name);

    return ok({ message: "Registration successful. Check your email for the verification code." }, 201);
  } catch (e) {
    return catchError(e);
  }
}

async function sendOtp(userId: string, email: string, name: string) {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await prisma.emailOtp.create({ data: { userId, email, codeHash, expiresAt } });
  await sendOtpEmail(email, name, otp);
}
