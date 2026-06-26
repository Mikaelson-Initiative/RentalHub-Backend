import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, catchError } from "@/lib/res";

export async function GET(req: NextRequest) {
  try {
    requireAuth(req, "ADMIN", "MODERATOR", "AUDITOR");

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") ?? undefined;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(50, Number(searchParams.get("pageSize") ?? 20));

    const where = role ? { role: role as "STUDENT" | "LANDLORD" | "ADMIN" } : {};
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, role: true,
          emailVerified: true, verificationStatus: true,
          isFrozen: true, frozenReason: true,
          createdAt: true, campus: true,
          matricCardUrl: true,
          studentIdUrl: true, portalScreenshotUrl: true,
          _count: { select: { properties: true, bookings: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return ok({ items, total, page, pageSize });
  } catch (e) {
    return catchError(e);
  }
}
