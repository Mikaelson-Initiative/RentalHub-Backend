import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";

export async function GET(req: NextRequest) {
  try {
    requireAuth(req, "STUDENT");
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get("reference");
    const bookingId = searchParams.get("bookingId");

    if (!reference || !bookingId) return fail("Reference and bookingId are required");

    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    const data = await res.json();

    if (!data.status || data.data?.status !== "success")
      return fail(data.message ?? "Payment verification failed", 402);

    const now = new Date();

    await prisma.payment.updateMany({
      where: { paystackRef: reference },
      data: { status: "SUCCESS", paidAt: now, channel: data.data.channel ?? null },
    });

    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: { paidAt: now, paymentStatus: "SUCCESS", status: "CONFIRMED" },
    });

    await prisma.property.update({
      where: { id: booking.propertyId },
      data: { vacantUnits: { decrement: 1 } },
    });

    return ok({ message: "Payment verified", booking });
  } catch (e) {
    return catchError(e);
  }
}
