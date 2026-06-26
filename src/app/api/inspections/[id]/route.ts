import "server-only";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedInspector, requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";

const INCLUDE = {
  property: {
    select: {
      id: true, title: true, description: true,
      images: true, distanceToCampus: true,
      location: { select: { name: true } },
    },
  },
  student:  { select: { id: true, name: true, email: true } },
  inspector: { select: { id: true, name: true } },
};

// PATCH — inspector accepts/completes a job; student leaves a review.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, notes, videoLink, rating, reviewNote } = body;

    if (!["accept", "complete", "review"].includes(action))
      return fail("action must be 'accept', 'complete', or 'review'.", 400);

    // ── Student review ────────────────────────────────────────────
    if (action === "review") {
      const auth = requireAuth(req, "STUDENT");
      const inspection = await prisma.inspection.findUnique({ where: { id } });
      if (!inspection) return fail("Inspection not found.", 404);
      if (inspection.studentId !== auth.userId)
        return fail("This is not your inspection.", 403);
      if (inspection.status !== "COMPLETED")
        return fail("You can only review a completed inspection.", 400);
      if (inspection.inspectorRating != null)
        return fail("You have already reviewed this inspection.", 409);

      const r = Number(rating);
      if (!Number.isInteger(r) || r < 1 || r > 5)
        return fail("Rating must be an integer between 1 and 5.", 400);

      const updated = await prisma.inspection.update({
        where: { id },
        data: { inspectorRating: r, inspectorReviewNote: reviewNote?.trim() ?? null },
        include: INCLUDE,
      });
      return ok(updated);
    }

    // ── Inspector accept / complete ───────────────────────────────
    const auth = requireVerifiedInspector(req);
    const inspector = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { verificationStatus: true },
    });
    if (inspector?.verificationStatus !== "VERIFIED")
      return fail("Your inspector account has not been verified yet.", 403);

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
        include: INCLUDE,
      });
      return ok(updated);
    }

    // complete
    if (inspection.inspectorId !== auth.userId)
      return fail("You are not assigned to this inspection.", 403);
    if (inspection.status !== "ACCEPTED")
      return fail("Inspection must be ACCEPTED before it can be completed.", 400);
    if (!videoLink?.trim())
      return fail("A Google Drive video link is required to complete an inspection.", 400);

    const isValidLink =
      /^https:\/\/(drive|docs)\.google\.com\//.test(videoLink.trim()) ||
      /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(videoLink.trim());
    if (!isValidLink)
      return fail("Link must be a Google Drive or YouTube URL.", 400);

    const updated = await prisma.inspection.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        notes: notes?.trim() ?? null,
        videoLink: videoLink.trim(),
      },
      include: INCLUDE,
    });
    return ok(updated);
  } catch (e) {
    return catchError(e);
  }
}
