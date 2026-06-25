import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = requireAuth(req);

    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif) return fail("Not found", 404);
    if (notif.userId !== auth.userId) return fail("Forbidden", 403);

    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: notif.readAt ?? new Date() },
    });

    return ok(updated);
  } catch (e) {
    return catchError(e);
  }
}
