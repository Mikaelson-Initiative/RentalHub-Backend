import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, catchError } from "@/lib/res";

export async function GET(req: NextRequest) {
  try {
    requireAuth(req, "ADMIN", "AUDITOR");

    const [totalProperties, pendingApprovals, totalUsers, totalBookings] = await Promise.all([
      prisma.property.count(),
      prisma.property.count({ where: { status: "PENDING" } }),
      prisma.user.count(),
      prisma.booking.count(),
    ]);

    return ok({ totalProperties, pendingApprovals, totalUsers, totalBookings });
  } catch (e) {
    return catchError(e);
  }
}
