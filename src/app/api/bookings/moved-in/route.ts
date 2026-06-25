import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";
import { createNotification } from "@/lib/notify";

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
      include: { property: { select: { title: true } } },
    });

    await createNotification(
      auth.userId,
      "MOVE_IN_CONFIRMED",
      "Move-in confirmed",
      `Welcome to your new place! You can now leave a review for "${updated.property?.title ?? "your property"}".`,
      `/dashboard/bookings/${bookingId}`
    );

    return ok(updated);
  } catch (e) {
    return catchError(e);
  }
}
