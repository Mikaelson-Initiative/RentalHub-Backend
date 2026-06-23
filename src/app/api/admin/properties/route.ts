import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, catchError } from "@/lib/res";

export async function GET(req: NextRequest) {
  try {
    requireAuth(req, "ADMIN");

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(50, Number(searchParams.get("pageSize") ?? 20));

    const where = status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" } : {};
    const [items, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          location: true,
          landlord: { select: { id: true, name: true, email: true, verificationStatus: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.property.count({ where }),
    ]);

    return ok({ items, total, page, pageSize });
  } catch (e) {
    return catchError(e);
  }
}
