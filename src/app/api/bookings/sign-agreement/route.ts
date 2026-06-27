import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, "STUDENT");
    const { bookingId, signedName } = await req.json();

    if (!bookingId || !signedName) return fail("Booking ID and signed name are required");

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return fail("Booking not found", 404);
    if (booking.studentId !== auth.userId) return fail("Forbidden", 403);
    if (!booking.paidAt) return fail("Payment must be completed before signing the agreement");

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { agreementSignedAt: new Date(), agreementSignedName: signedName },
    });

    return ok(updated);
  } catch (e) {
    return catchError(e);
  }
}
