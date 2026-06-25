import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAuth(req, "ADMIN");
    const { id } = await params;
    if (!id) return fail("Location id is required.", 400);

    const linked = await prisma.property.count({ where: { locationId: id } });
    if (linked > 0) return fail(`Cannot delete — ${linked} listing${linked === 1 ? "" : "s"} use this area. Reassign them first.`, 409);

    await prisma.location.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return catchError(e);
  }
}
