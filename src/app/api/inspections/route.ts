import "server-only";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";
import { inspectionLimiter } from "@/lib/rate-limit";

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

// GET — students see their own requests; inspectors see jobs assigned to them; admins see all.
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let where: any = {};
    if (auth.role === "STUDENT") where = { studentId: auth.userId };
    else if (auth.role === "INSPECTOR") {
      // Show jobs explicitly assigned to this inspector OR open undirected REQUESTED jobs.
      // Directed requests (inspectorId set to someone else) stay hidden.
      where = { OR: [{ inspectorId: auth.userId }, { status: "REQUESTED", inspectorId: null }] };
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
  const limited = await inspectionLimiter(req);
  if (limited) return limited;

  try {
    const auth = requireAuth(req, "STUDENT");
    const { propertyId, inspectorId } = await req.json();
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

    // Directed requests get 48 h; open requests expire in 24 h.
    const expiresAt = new Date(Date.now() + (inspectorId ? 48 : 24) * 60 * 60 * 1000);
    const inspection = await prisma.inspection.create({
      data: { propertyId, studentId: auth.userId, expiresAt, ...(inspectorId ? { inspectorId } : {}) },
      include: INCLUDE,
    });

    return ok(inspection, 201);
  } catch (e) {
    return catchError(e);
  }
}
