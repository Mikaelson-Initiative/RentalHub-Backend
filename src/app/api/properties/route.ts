import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth, requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";
import { PropertyQuerySchema, PropertyCreateSchema } from "@/lib/validations";

const INCLUDE = {
  location: true,
  landlord: { select: { id: true, name: true, email: true, verificationStatus: true } },
  _count: { select: { bookings: true } },
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsedQuery = PropertyQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsedQuery.success) {
      return fail(parsedQuery.error.issues[0].message, 400);
    }
    const { mine, status, campus, page, pageSize } = parsedQuery.data;

    const auth = getAuth(req);

     
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
    const auth = await requireAuth(req, "LANDLORD");

    const landlord = await prisma.user.findUnique({ where: { id: auth.userId }, select: { verificationStatus: true, campus: true } });
    if (landlord?.verificationStatus !== "VERIFIED")
      return fail("Your account must be verified before you can submit a listing", 403);

    const body = await req.json();
    const result = PropertyCreateSchema.safeParse(body);
    if (!result.success) return fail(result.error.issues[0].message, 400);

    const { title, description, price, locationName, locationId, distanceToCampus, amenities, images, vacantUnits } = result.data;

     
    let locationConnect: any = undefined;
    if (locationId) {
      locationConnect = { connect: { id: locationId } };
    } else if (locationName) {
      locationConnect = { connectOrCreate: { where: { name: locationName }, create: { name: locationName, campus: landlord?.campus ?? "bouesti" } } };
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
