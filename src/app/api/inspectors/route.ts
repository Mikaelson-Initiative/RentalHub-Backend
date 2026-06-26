import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, catchError } from "@/lib/res";

// GET /api/inspectors?campus=bouesti
// Returns all VERIFIED inspectors for a campus with their completed job count
// and average student rating. Public endpoint — no auth required.
export async function GET(req: NextRequest) {
  try {
    const campus = req.nextUrl.searchParams.get("campus") ?? undefined;

    const users = await prisma.user.findMany({
      where: {
        role: "INSPECTOR",
        verificationStatus: "VERIFIED",
        ...(campus ? { campus } : {}),
      },
      select: {
        id: true,
        name: true,
        campus: true,
        inspectionsAsInspector: {
          where: { status: "COMPLETED" },
          select: { inspectorRating: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const inspectors = users.map((u) => {
      const rated = u.inspectionsAsInspector.filter((i) => i.inspectorRating != null);
      const avgRating = rated.length
        ? rated.reduce((s, i) => s + (i.inspectorRating ?? 0), 0) / rated.length
        : null;
      return {
        id: u.id,
        name: u.name,
        campus: u.campus,
        completedCount: u.inspectionsAsInspector.length,
        avgRating: avgRating != null ? Math.round(avgRating * 10) / 10 : null,
      };
    });

    return ok(inspectors);
  } catch (e) {
    return catchError(e);
  }
}
