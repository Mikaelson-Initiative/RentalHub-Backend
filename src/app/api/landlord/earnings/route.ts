import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, catchError } from "@/lib/res";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, "LANDLORD");

    const bookings = await prisma.booking.findMany({
      where: { property: { landlordId: auth.userId }, paidAt: { not: null } },
      include: {
        property: { select: { title: true } },
        student: { select: { name: true } },
        payments: { select: { paystackRef: true }, take: 1 },
      },
      orderBy: { paidAt: "desc" },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalEarnings = 0;
    let monthlyEarnings = 0;
    const rows = [];

    for (const b of bookings) {
      const amount = Number(b.bidAmount ?? 0);
      totalEarnings += amount;
      if (b.paidAt && b.paidAt >= startOfMonth) monthlyEarnings += amount;
      rows.push({
        id: b.id,
        propertyTitle: b.property.title,
        studentName: b.student.name,
        amount,
        paidAt: b.paidAt,
        moveInDate: b.moveInDate,
        paystackRef: b.payments[0]?.paystackRef ?? null,
      });
    }

    return ok({ totalEarnings, monthlyEarnings, totalPaidBookings: bookings.length, bookings: rows });
  } catch (e) {
    return catchError(e);
  }
}
