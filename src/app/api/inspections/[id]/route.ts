import "server-only";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedInspector } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";

// PATCH — inspector accepts or completes a job.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireVerifiedInspector(req);

    // Confirmed inspectors only.
    const inspector = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { verificationStatus: true },
    });
    if (inspector?.verificationStatus !== "VERIFIED")
      return fail("Your inspector account has not been verified yet.", 403);

    const { id } = await params;
    const { action, notes } = await req.json();

    if (!["accept", "complete"].includes(action))
      return fail("action must be 'accept' or 'complete'.", 400);

    const inspection = await prisma.inspection.findUnique({ where: { id } });
    if (!inspection) return fail("Inspection not found.", 404);
    if (inspection.status === "EXPIRED") return fail("This inspection has expired.", 410);
    if (inspection.status === "COMPLETED") return fail("This inspection is already completed.", 409);

    if (action === "accept") {
      if (inspection.status !== "REQUESTED")
        return fail("Only REQUESTED inspections can be accepted.", 400);
      if (inspection.inspectorId && inspection.inspectorId !== auth.userId)
        return fail("This job is already assigned to another inspector.", 409);

      const updated = await prisma.inspection.update({
        where: { id },
        data: { status: "ACCEPTED", inspectorId: auth.userId },
      });
      return ok(updated);
    }

    // complete
    if (inspection.inspectorId !== auth.userId)
      return fail("You are not assigned to this inspection.", 403);
    if (inspection.status !== "ACCEPTED")
      return fail("Inspection must be ACCEPTED before it can be completed.", 400);

    const updated = await prisma.inspection.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date(), notes: notes?.trim() ?? null },
    });
    return ok(updated);
  } catch (e) {
    return catchError(e);
  }
}
