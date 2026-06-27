import { NextRequest } from "next/server";
import { prismaAdmin as prisma } from "@/lib/prisma-admin";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";
import { decrypt } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req, "ADMIN", "AUDITOR");

    const payouts = await prisma.booking.findMany({
      where: { paidAt: { not: null }, payoutStatus: "PENDING" },
      include: {
        student: { select: { name: true } },
        property: {
          include: {
            location: { select: { name: true } },
            landlord: {
              select: { name: true, bankName: true, bankAccountNumber: true, bankAccountName: true },
            },
          },
        },
      },
      orderBy: { paidAt: "asc" },
    });

    payouts.forEach((p) => {
      if (p.property?.landlord?.bankAccountNumber) {
        p.property.landlord.bankAccountNumber = decrypt(p.property.landlord.bankAccountNumber);
      }
    });

    return ok(payouts);
  } catch (e) {
    return catchError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAuth(req, "ADMIN", "AUDITOR");
    const { bookingId, action } = await req.json();

    if (!bookingId || !action) return fail("bookingId and action are required");
    if (!["COMPLETE", "FAIL"].includes(action)) return fail("Action must be COMPLETE or FAIL");

    // Map frontend's COMPLETE/FAIL to production enum COMPLETED/FAILED
    const payoutStatus = action === "COMPLETE" ? "COMPLETED" : "FAILED";

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { payoutStatus },
    });

    return ok(updated);
  } catch (e) {
    return catchError(e);
  }
}
