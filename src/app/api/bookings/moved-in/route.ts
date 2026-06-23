import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req, "STUDENT");
    const { bookingId } = await req.json();

    if (!bookingId) return fail("Booking ID is required");

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return fail("Booking not found", 404);
    if (booking.studentId !== auth.userId) return fail("Forbidden", 403);
    if (!booking.agreementSignedAt) return fail("Agreement must be signed before confirming move-in");

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { movedInConfirmedAt: new Date() },
    });

    return ok(updated);
  } catch (e) {
    return catchError(e);
  }
}
