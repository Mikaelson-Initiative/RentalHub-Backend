import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";

// ADMIN and MODERATOR can freeze/flag users.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAuth(req, "ADMIN", "MODERATOR");
    const { id } = await params;
    const { action, reason } = await req.json();

    if (!action) return fail("action is required");
    if (!["FREEZE", "UNFREEZE", "FLAG", "UNFLAG"].includes(action)) {
      return fail("action must be FREEZE, UNFREEZE, FLAG, or UNFLAG");
    }

    // Prevent moderators from touching other admin-level accounts
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!target) return fail("User not found", 404);
    if (["ADMIN", "MODERATOR", "AUDITOR"].includes(target.role)) {
      return fail("Staff accounts cannot be managed through this endpoint");
    }

    const data: Record<string, unknown> = {};
    if (action === "FREEZE")   { data.isFrozen = true;  data.frozenReason = reason ?? null; }
    if (action === "UNFREEZE") { data.isFrozen = false; data.frozenReason = null; }
    if (action === "FLAG")     { data.frozenReason = reason ?? null; }
    if (action === "UNFLAG")   { data.frozenReason = null; }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, isFrozen: true, frozenReason: true },
    });

    return ok(user);
  } catch (e) {
    return catchError(e);
  }
}
