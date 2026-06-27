import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, catchError } from "@/lib/res";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, "LANDLORD");

    const properties = await prisma.property.findMany({
      where: { landlordId: auth.userId },
      include: {
        bookings: { select: { id: true, status: true, createdAt: true, paidAt: true } },
        _count: { select: { bookings: true } },
      },
    });

    const rows = properties.map((p) => {
      const total = p.bookings.length;
      const paid = p.bookings.filter((b) => b.status === "PAID").length;
      const conversionRate = total > 0 ? Math.round((paid / total) * 100) : 0;

      // Average days to fill = avg days from property creation to first paid booking
      const paidDates = p.bookings
        .filter((b) => b.status === "PAID" && b.paidAt)
        .map((b) => (new Date(b.paidAt!).getTime() - new Date(p.createdAt).getTime()) / 86_400_000);
      const avgDaysToFill = paidDates.length
        ? Math.round(paidDates.reduce((a, b) => a + b, 0) / paidDates.length)
        : null;

      return {
        id: p.id,
        title: p.title,
        viewCount: p.viewCount,
        totalBookings: total,
        paidBookings: paid,
        conversionRate,
        avgDaysToFill,
        status: p.status,
        vacantUnits: p.vacantUnits,
      };
    });

    const totals = {
      totalViews: rows.reduce((s, r) => s + r.viewCount, 0),
      totalBookings: rows.reduce((s, r) => s + r.totalBookings, 0),
      totalPaid: rows.reduce((s, r) => s + r.paidBookings, 0),
      avgConversion: rows.length
        ? Math.round(rows.reduce((s, r) => s + r.conversionRate, 0) / rows.length)
        : 0,
    };

    return ok({ rows, totals });
  } catch (e) {
    return catchError(e);
  }
}
