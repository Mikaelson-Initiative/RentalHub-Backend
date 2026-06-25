import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, catchError } from "@/lib/res";

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));

    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: auth.userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({ where: { userId: auth.userId, readAt: null } }),
    ]);

    return ok({ items, unreadCount });
  } catch (e) {
    return catchError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    const { action } = await req.json();
    if (action === "readAll") {
      await prisma.notification.updateMany({
        where: { userId: auth.userId, readAt: null },
        data: { readAt: new Date() },
      });
    }
    return ok({ ok: true });
  } catch (e) {
    return catchError(e);
  }
}
