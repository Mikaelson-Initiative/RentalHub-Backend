import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";

const INCLUDE = {
  location: true,
  landlord: { select: { id: true, name: true, email: true, verificationStatus: true } },
  _count: { select: { bookings: true } },
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const property = await prisma.property.findUnique({ where: { id }, include: INCLUDE });
    if (!property) return fail("Property not found", 404);
    // Fire-and-forget view count increment
    prisma.property.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    return ok(property);
  } catch (e) {
    return catchError(e);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = requireAuth(req, "LANDLORD", "ADMIN");
    const body = await req.json();

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) return fail("Property not found", 404);
    if (auth.role === "LANDLORD" && property.landlordId !== auth.userId)
      return fail("Forbidden", 403);

    const { title, description, price, locationName, locationId, distanceToCampus, amenities, images, vacantUnits } =
      body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let locationConnect: any = undefined;
    if (locationId) {
      locationConnect = { connect: { id: locationId } };
    } else if (locationName) {
      locationConnect = { connectOrCreate: { where: { name: locationName }, create: { name: locationName } } };
    }

    const updated = await prisma.property.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(distanceToCampus !== undefined && { distanceToCampus }),
        ...(amenities !== undefined && { amenities }),
        ...(images !== undefined && { images }),
        ...(vacantUnits !== undefined && { vacantUnits }),
        ...(locationConnect ? { location: locationConnect } : {}),
      },
      include: INCLUDE,
    });

    return ok(updated);
  } catch (e) {
    return catchError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = requireAuth(req, "LANDLORD", "ADMIN");

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) return fail("Property not found", 404);
    if (auth.role === "LANDLORD" && property.landlordId !== auth.userId)
      return fail("Forbidden", 403);

    await prisma.property.delete({ where: { id } });
    return ok({ message: "Property deleted" });
  } catch (e) {
    return catchError(e);
  }
}
