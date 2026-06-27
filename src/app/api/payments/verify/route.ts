import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";
import { sendPaymentReceiptEmail } from "@/lib/email";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req, "STUDENT");
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get("reference");
    const bookingId = searchParams.get("bookingId");

    if (!reference || !bookingId) return fail("Reference and bookingId are required");

    // Verify the booking belongs to this student before touching any records.
    const bookingOwner = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { studentId: true },
    });
    if (!bookingOwner) return fail("Booking not found", 404);
    if (bookingOwner.studentId !== auth.userId) return fail("Forbidden", 403);

    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    const data = await res.json();

    if (!data.status || data.data?.status !== "success")
      return fail(data.message ?? "Payment verification failed", 402);

    const now = new Date();

    // Atomically verify payment and mark booking PAID in a single transaction.
    // The idempotency check on booking.paidAt prevents double-processing if two
    // concurrent verify calls both receive a "success" response from Paystack.
    const [booking] = await prisma.$transaction(async (tx) => {
      const current = await tx.booking.findUnique({
        where: { id: bookingId },
        select: { paidAt: true },
      });
      if (current?.paidAt) return [null];

      await tx.payment.updateMany({
        where: { paystackRef: reference },
        data: { status: "SUCCESS", paidAt: now, channel: data.data.channel ?? null },
      });

      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { paidAt: now, paymentStatus: "SUCCESS", status: "PAID" },
        include: {
          student: { select: { name: true, email: true } },
          property: { select: { title: true, location: { select: { name: true } } } },
        },
      });

      await tx.property.update({
        where: { id: updatedBooking.propertyId },
        data: {
          listingStatus: "RENTED",
          vacantUnits: { decrement: 1 },
        },
      });

      return [updatedBooking];
    });

    if (!booking) return ok({ message: "Payment already verified", booking: null });


    if (booking.student && booking.property) {
      await sendPaymentReceiptEmail(
        booking.student.email,
        booking.student.name,
        booking.property.title,
        booking.property.location?.name ?? "—",
        Number(booking.bidAmount ?? 0),
        Number(booking.agencyFee ?? 0),
        Number(booking.cautionFee ?? 0),
        bookingId,
      );
    }

    return ok({ message: "Payment verified", booking });
  } catch (e) {
    return catchError(e);
  }
}
