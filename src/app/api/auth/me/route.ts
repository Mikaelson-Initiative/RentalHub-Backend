import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, catchError } from "@/lib/res";

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true, name: true, email: true, role: true,
        emailVerified: true, verificationStatus: true,
        phoneNumber: true, avatarUrl: true,
        bankName: true, bankAccountNumber: true, bankAccountName: true,
        governmentIdUrl: true, selfieUrl: true, ownershipProofUrl: true,
        matricCardUrl: true,
      },
    });
    return ok(user);
  } catch (e) {
    return catchError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    const body = await req.json();

    const allowed = ["name", "phoneNumber", "bankName", "bankAccountNumber", "bankAccountName", "governmentIdUrl", "selfieUrl", "ownershipProofUrl", "matricCardUrl"];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body && body[key] !== undefined) data[key] = body[key];
    }

    // Submitting all three doc URLs triggers verification review
    if (data.governmentIdUrl && data.selfieUrl && data.ownershipProofUrl) {
      data.verificationStatus = "UNDER_REVIEW";
    }

    const user = await prisma.user.update({
      where: { id: auth.userId },
      data,
      select: {
        id: true, name: true, email: true, role: true,
        emailVerified: true, verificationStatus: true,
        phoneNumber: true, avatarUrl: true,
        bankName: true, bankAccountNumber: true, bankAccountName: true,
      },
    });

    return ok(user);
  } catch (e) {
    return catchError(e);
  }
}
