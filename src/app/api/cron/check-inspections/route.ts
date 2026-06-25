import "server-only";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail, catchError } from "@/lib/res";

export async function GET(req: NextRequest) {
  try {
    // Vercel cron calls this with a secret header; reject everything else.
    const secret = req.headers.get("authorization")?.replace("Bearer ", "");
    if (secret !== process.env.CRON_SECRET) return fail("Unauthorized", 401);

    const now = new Date();

    // Find all inspections that are past their deadline and not yet terminal.
    const expired = await prisma.inspection.findMany({
      where: { status: { in: ["REQUESTED", "ACCEPTED"] }, expiresAt: { lt: now } },
      select: { id: true, inspectorId: true, propertyId: true },
    });

    if (expired.length === 0) return ok({ expired: 0 });

    // Process each expired inspection atomically (one interactive transaction per job).
    for (const job of expired) {
      await prisma.$transaction(async (tx) => {
        // 1. Mark inspection EXPIRED.
        await tx.inspection.update({ where: { id: job.id }, data: { status: "EXPIRED" } });
        // 2. Reset property back to AVAILABLE.
        await tx.property.update({ where: { id: job.propertyId }, data: { listingStatus: "AVAILABLE" } });
        // 3. Strike the assigned inspector (if any).
        if (job.inspectorId) {
          await tx.user.update({ where: { id: job.inspectorId }, data: { strikeCount: { increment: 1 } } });
        }
      });
    }

    return ok({ expired: expired.length });
  } catch (e) {
    return catchError(e);
  }
}
