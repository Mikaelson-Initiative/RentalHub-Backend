import { NextRequest } from "next/server";
import { prismaAdmin as prisma } from "@/lib/prisma-admin";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";
import { sendLandlordVerifiedEmail, sendLandlordRejectedEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req, "ADMIN", "MODERATOR");

    const landlords = await prisma.user.findMany({
      where: { role: "LANDLORD" },
      select: {
        id: true, name: true, email: true, verificationStatus: true,
        governmentIdUrl: true, selfieUrl: true, ownershipProofUrl: true,
        createdAt: true,
        _count: { select: { properties: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(landlords);
  } catch (e) {
    return catchError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAuth(req, "ADMIN", "MODERATOR");
    const { landlordId, action, note } = await req.json();

    if (!landlordId || !action) return fail("landlordId and action are required");
    if (!["APPROVE", "REJECT"].includes(action)) return fail("Action must be APPROVE or REJECT");

    const verificationStatus = action === "APPROVE" ? "VERIFIED" : "REJECTED";

    const user = await prisma.user.update({
      where: { id: landlordId },
      data: { verificationStatus },
      select: { id: true, name: true, email: true, verificationStatus: true },
    });

    if (action === "APPROVE") {
      await sendLandlordVerifiedEmail(user.email, user.name);
    } else {
      await sendLandlordRejectedEmail(user.email, user.name, note ?? null);
    }

    return ok(user);
  } catch (e) {
    return catchError(e);
  }
}
