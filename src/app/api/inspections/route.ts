import "server-only";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";

const INCLUDE = {
  property: { select: { id: true, title: true, location: { select: { name: true } } } },
  student:  { select: { id: true, name: true, email: true } },
  inspector: { select: { id: true, name: true } },
};

// GET — students see their own requests; inspectors see jobs assigned to them; admins see all.
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let where: any = {};
    if (auth.role === "STUDENT") where = { studentId: auth.userId };
    else if (auth.role === "INSPECTOR") {
      // Show jobs already assigned to this inspector PLUS any open REQUESTED jobs they can pick up.
      where = { OR: [{ inspectorId: auth.userId }, { status: "REQUESTED" }] };
    }
    // ADMIN / MODERATOR see everything (no filter)

    const items = await prisma.inspection.findMany({
      where,
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return ok(items);
  } catch (e) {
    return catchError(e);
  }
}

// POST — student requests an inspection for a property.
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req, "STUDENT");
    const { propertyId } = await req.json();
    if (!propertyId) return fail("propertyId is required.", 400);

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, status: true, listingStatus: true },
    });
    if (!property) return fail("Property not found.", 404);
    if (property.status !== "APPROVED" || property.listingStatus !== "AVAILABLE")
      return fail("This property is not available for inspection.", 400);

    // Prevent duplicate open requests.
    const existing = await prisma.inspection.findFirst({
      where: { propertyId, studentId: auth.userId, status: { in: ["REQUESTED", "ACCEPTED"] } },
    });
    if (existing) return fail("You already have an open inspection request for this property.", 409);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h window
    const inspection = await prisma.inspection.create({
      data: { propertyId, studentId: auth.userId, expiresAt },
      include: INCLUDE,
    });

    return ok(inspection, 201);
  } catch (e) {
    return catchError(e);
  }
}
