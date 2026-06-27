import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";
import { encrypt, decrypt } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true, name: true, email: true, role: true,
        emailVerified: true, verificationStatus: true,
        phoneNumber: true, avatarUrl: true, campus: true,
        bankName: true, bankAccountNumber: true, bankAccountName: true,
        governmentIdUrl: true, selfieUrl: true, ownershipProofUrl: true,
        matricCardUrl: true,
      },
    });
    if (user && user.bankAccountNumber) {
      user.bankAccountNumber = decrypt(user.bankAccountNumber);
    }
    return ok(user);
  } catch (e) {
    return catchError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();

    // Password change — separate from profile update
    if (body.currentPassword || body.newPassword) {
      if (!body.currentPassword || !body.newPassword) return fail("Both currentPassword and newPassword are required");
      if (body.newPassword.length < 8) return fail("New password must be at least 8 characters");

      const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { password: true } });
      if (!user?.password) return fail("Cannot change password for this account");

      const match = await bcrypt.compare(body.currentPassword, user.password);
      if (!match) return fail("Current password is incorrect");

      await prisma.user.update({ where: { id: auth.userId }, data: { password: await bcrypt.hash(body.newPassword, 12) } });
      return ok({ message: "Password updated" });
    }

    const allowed = ["name", "phoneNumber", "campus", "bankName", "bankAccountNumber", "bankAccountName", "governmentIdUrl", "selfieUrl", "ownershipProofUrl", "matricCardUrl", "studentIdUrl", "portalScreenshotUrl"];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body && body[key] !== undefined) data[key] = body[key];
    }
    
    if (data.bankAccountNumber && typeof data.bankAccountNumber === "string") {
      data.bankAccountNumber = encrypt(data.bankAccountNumber);
    }

    // Landlord: submitting all three doc URLs triggers verification review
    if (data.governmentIdUrl && data.selfieUrl && data.ownershipProofUrl) {
      data.verificationStatus = "UNDER_REVIEW";
    }

    // Student: uploading matric card triggers verification review (don't downgrade if already VERIFIED)
    if (auth.role === "STUDENT" && data.matricCardUrl) {
      const current = await prisma.user.findUnique({ where: { id: auth.userId }, select: { verificationStatus: true } });
      if (current?.verificationStatus === "UNVERIFIED") {
        data.verificationStatus = "UNDER_REVIEW";
      }
    }

    const user = await prisma.user.update({
      where: { id: auth.userId },
      data,
      select: {
        id: true, name: true, email: true, role: true,
        emailVerified: true, verificationStatus: true,
        phoneNumber: true, avatarUrl: true,
        bankName: true, bankAccountNumber: true, bankAccountName: true,
        matricCardUrl: true,
      },
    });

    if (user.bankAccountNumber) {
      user.bankAccountNumber = decrypt(user.bankAccountNumber);
    }

    return ok(user);
  } catch (e) {
    return catchError(e);
  }
}
