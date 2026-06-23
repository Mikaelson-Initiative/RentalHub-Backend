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

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let where: any = {};
    if (auth.role === "STUDENT") {
      where = { studentId: auth.userId };
    } else if (auth.role === "LANDLORD") {
      where = { property: { landlordId: auth.userId } };
    } else if (auth.role === "ADMIN") {
      where = {};
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    return ok(bookings);
  } catch (e) {
    return catchError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req, "STUDENT");
    const { propertyId, bidAmount } = await req.json();

    if (!propertyId) return fail("Property ID is required");

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) return fail("Property not found", 404);
    if (property.status !== "APPROVED") return fail("Property is not available for booking");
    if (property.vacantUnits < 1) return fail("No vacant units available");

    const bid = Number(bidAmount ?? property.price);
    const agencyFee = Math.round(bid * 0.05 * 100) / 100;
    const cautionFee = Math.round(bid * 0.10 * 100) / 100;

    const booking = await prisma.booking.create({
      data: {
        property: { connect: { id: propertyId } },
        student: { connect: { id: auth.userId } },
        bidAmount: bid,
        agencyFee,
        cautionFee,
      },
      include: INCLUDE,
    });

    return ok(booking, 201);
  } catch (e) {
    return catchError(e);
  }
}
