import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";

const ALLOWED_ACTIONS = ["FREEZE", "UNFREEZE", "FLAG", "UNFLAG", "VERIFY", "REJECT"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = requireAuth(req, "ADMIN", "MODERATOR");
    const { id } = await params;
    const { action, reason } = await req.json();

    if (!action) return fail("action is required");
    if (!ALLOWED_ACTIONS.includes(action)) {
      return fail("action must be one of: FREEZE, UNFREEZE, VERIFY, REJECT, FLAG, UNFLAG");
    }

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
    if (action === "VERIFY")   { data.verificationStatus = "VERIFIED"; }
    if (action === "REJECT")   { data.verificationStatus = "REJECTED"; }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, name: true, email: true, role: true,
        isFrozen: true, frozenReason: true, verificationStatus: true,
      },
    });

    console.log(JSON.stringify({
      audit: true,
      action,
      targetUserId: id,
      actorId: actor.userId,
      actorRole: actor.role,
      reason: reason ?? null,
      ts: new Date().toISOString(),
    }));

    return ok(user);
  } catch (e) {
    return catchError(e);
  }
}
