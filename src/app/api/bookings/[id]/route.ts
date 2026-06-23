import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";

const INCLUDE = {
  property: {
    include: {
      location: true,
      landlord: { select: { id: true, name: true, email: true, bankName: true, bankAccountNumber: true, bankAccountName: true } },
    },
  },
  student: { select: { id: true, name: true, email: true } },
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = requireAuth(req);

    const booking = await prisma.booking.findUnique({ where: { id }, include: INCLUDE });
    if (!booking) return fail("Booking not found", 404);

    const isStudent = auth.role === "STUDENT" && booking.studentId === auth.userId;
    const isLandlord = auth.role === "LANDLORD" && booking.property?.landlord?.id === auth.userId;
    const isAdmin = auth.role === "ADMIN";

    if (!isStudent && !isLandlord && !isAdmin) return fail("Forbidden", 403);

    return ok(booking);
  } catch (e) {
    return catchError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = requireAuth(req);
    const body = await req.json();

    const booking = await prisma.booking.findUnique({ where: { id }, include: { property: true } });
    if (!booking) return fail("Booking not found", 404);

    const isLandlord = auth.role === "LANDLORD" && booking.property?.landlordId === auth.userId;
    const isAdmin = auth.role === "ADMIN";

    if (!isLandlord && !isAdmin) return fail("Forbidden", 403);

    const { status } = body;
    if (!["CONFIRMED", "CANCELLED"].includes(status))
      return fail("Status must be CONFIRMED or CANCELLED");

    const updated = await prisma.booking.update({
      where: { id },
      data: { status },
      include: INCLUDE,
    });

    return ok(updated);
  } catch (e) {
    return catchError(e);
  }
}
