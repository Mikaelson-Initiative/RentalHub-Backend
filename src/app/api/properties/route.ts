import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth, requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";

const INCLUDE = {
  location: true,
  landlord: { select: { id: true, name: true, email: true, verificationStatus: true } },
  _count: { select: { bookings: true } },
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mine = searchParams.get("mine") === "true";
    const status = searchParams.get("status");
    const campus = searchParams.get("campus");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") ?? "12"));

    const auth = getAuth(req);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (mine && auth?.role === "LANDLORD") {
      where.landlordId = auth.userId;
      // Landlord sees all their own listings regardless of listingStatus
    } else if (status && auth?.role === "ADMIN") {
      where.status = status;
    } else {
      // Public marketplace: only show admin-approved AND available listings
      where.status = "APPROVED";
      where.listingStatus = "AVAILABLE";
    }

    if (campus) {
      where.location = { campus };
    }

    const [items, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: INCLUDE,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.property.count({ where }),
    ]);

    return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (e) {
    return catchError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req, "LANDLORD");

    const landlord = await prisma.user.findUnique({ where: { id: auth.userId }, select: { verificationStatus: true } });
    if (landlord?.verificationStatus !== "VERIFIED")
      return fail("Your account must be verified before you can submit a listing", 403);

    const { title, description, price, locationName, locationId, distanceToCampus, amenities, images, vacantUnits } =
      await req.json();

    if (!title || !description || !price) return fail("Title, description, and price are required");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let locationConnect: any = undefined;
    if (locationId) {
      locationConnect = { connect: { id: locationId } };
    } else if (locationName) {
      locationConnect = { connectOrCreate: { where: { name: locationName }, create: { name: locationName } } };
    }

    const property = await prisma.property.create({
      data: {
        title,
        description,
        price,
        distanceToCampus: distanceToCampus ?? null,
        amenities: amenities ?? [],
        images: images ?? [],
        vacantUnits: vacantUnits ?? 1,
        landlord: { connect: { id: auth.userId } },
        ...(locationConnect ? { location: locationConnect } : {}),
      },
      include: INCLUDE,
    });

    return ok(property, 201);
  } catch (e) {
    return catchError(e);
  }
}
