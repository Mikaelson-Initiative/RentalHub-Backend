import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, "STUDENT");
    const { bookingId } = await req.json();
    if (!bookingId) return fail("Booking ID is required");

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { student: true, property: true },
    });
    if (!booking) return fail("Booking not found", 404);
    if (booking.studentId !== auth.userId) return fail("Forbidden", 403);
    if (booking.paidAt) return fail("This booking has already been paid");

    const total =
      Number(booking.bidAmount ?? 0) +
      Number(booking.agencyFee ?? 0) +
      Number(booking.cautionFee ?? 0);
    const amountKobo = Math.round(total * 100);
    const reference = `RH-${bookingId.slice(0, 8)}-${Date.now()}`;
    const callbackUrl = `${process.env.FRONTEND_URL}/student/bookings/${bookingId}/verify-payment`;

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: booking.student.email,
        amount: amountKobo,
        reference,
        callback_url: callbackUrl,
        metadata: { bookingId, propertyTitle: booking.property?.title },
      }),
    });

    const data = await res.json();
    if (!data.status) return fail(data.message ?? "Paystack error", 502);

    // Create a pending payment record to track this transaction
    await prisma.payment.create({
      data: { bookingId, amount: total, paystackRef: reference },
    });

    return ok({ authorizationUrl: data.data.authorization_url, reference });
  } catch (e) {
    return catchError(e);
  }
}
