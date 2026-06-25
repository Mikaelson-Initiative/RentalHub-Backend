import "server-only";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/email";
import { ok, fail, catchError } from "@/lib/res";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, matricNumber, campus } = await req.json();

    if (!name?.trim() || !email?.trim() || !password || !matricNumber?.trim()) {
      return fail("Name, email, password, and matric number are required.");
    }
    if (!email.includes("@")) return fail("Enter a valid email address.");
    if (password.length < 8) return fail("Password must be at least 8 characters.");

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) return fail("Email already registered.", 409);

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashed,
        role: "INSPECTOR",
        verificationStatus: "UNDER_REVIEW",
        matricNumber: matricNumber.trim(),
        campus: campus?.trim() || "bouesti",
      },
      select: { id: true, name: true, email: true, role: true, verificationStatus: true, campus: true },
    });

    // OTP for email verification
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(otp, 10);
    await prisma.emailOtp.create({
      data: { userId: user.id, email: user.email, codeHash, expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
    });
    await sendOtpEmail(user.email, user.name, otp);

    // Return a short-lived token so the frontend can immediately upload documents
    const token = signToken({ userId: user.id, email: user.email, role: "INSPECTOR" });

    return ok({ token, user }, 201);
  } catch (e) {
    return catchError(e);
  }
}
