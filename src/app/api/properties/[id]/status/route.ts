import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    requireAuth(req, "ADMIN");

    const { status, reason } = await req.json();
    if (!["APPROVED", "REJECTED"].includes(status))
      return fail("Status must be APPROVED or REJECTED");

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) return fail("Property not found", 404);

    const updated = await prisma.property.update({
      where: { id },
      data: { status, rejectionReason: reason ?? null },
      include: {
        location: true,
        landlord: { select: { id: true, name: true, email: true, verificationStatus: true } },
      },
    });

    return ok(updated);
  } catch (e) {
    return catchError(e);
  }
}
