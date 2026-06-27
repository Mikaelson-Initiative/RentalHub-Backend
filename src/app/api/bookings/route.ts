import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";
import { createNotification } from "@/lib/notify";
import { BookingCreateSchema } from "@/lib/validations";
import { bookingLimiter } from "@/lib/rate-limit";
import { decrypt } from "@/lib/encryption";

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
    const auth = await requireAuth(req);

     
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

    bookings.forEach(b => {
      if (b.property?.landlord?.bankAccountNumber) {
        b.property.landlord.bankAccountNumber = decrypt(b.property.landlord.bankAccountNumber);
      }
    });

    return ok(bookings);
  } catch (e) {
    return catchError(e);
  }
}

export async function POST(req: NextRequest) {
  const limited = await bookingLimiter(req);
  if (limited) return limited;

  try {
    const auth = await requireAuth(req, "STUDENT");
    const body = await req.json();
    const result = BookingCreateSchema.safeParse(body);
    if (!result.success) return fail(result.error.issues[0].message, 400);

    const { propertyId, bidAmount, referralCode } = result.data;

    const student = await prisma.user.findUnique({ where: { id: auth.userId }, select: { matricCardUrl: true } });
    if (!student?.matricCardUrl) return fail("Please upload your student ID card before placing a booking. Go to Profile to upload.", 403);

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) return fail("Property not found", 404);
    if (property.status !== "APPROVED") return fail("Property is not available for booking");
    if (property.vacantUnits < 1) return fail("No vacant units available");

    // Prevent duplicate open bookings for the same property.
    const duplicate = await prisma.booking.findFirst({
      where: { propertyId, studentId: auth.userId, status: { in: ["PENDING", "CONFIRMED", "AWAITING_PAYMENT"] } },
    });
    if (duplicate) return fail("You already have an active booking for this property.", 409);

    const listingPrice = Number(property.price);
    const bid = bidAmount != null ? Number(bidAmount) : listingPrice;

    // Reject bids below 50% of listing price to prevent fee-manipulation attacks.
    if (bid < listingPrice * 0.5) return fail("Bid amount is too low.");
    // Reject bids more than 2× listing price as likely an input error.
    if (bid > listingPrice * 2) return fail("Bid amount is too high.");

    let agencyFee = Math.round(bid * 0.05 * 100) / 100;
    const cautionFee = Math.round(bid * 0.10 * 100) / 100;

    // Apply referral discount
    let appliedReferralCode: string | undefined;
    if (referralCode) {
      const referral = await prisma.referral.findUnique({ where: { code: (referralCode as string).toUpperCase() } });
      if (referral && !referral.usedById) {
        agencyFee = Math.round(agencyFee * 0.95 * 100) / 100;
        appliedReferralCode = referral.code;
        await prisma.referral.update({ where: { id: referral.id }, data: { usedById: auth.userId, usedAt: new Date() } });
      }
    }

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

    // Notify landlord
    await createNotification(
      property.landlordId,
      "BOOKING_REQUEST",
      "New booking request",
      `A student has requested to book "${property.title}".`,
      `/dashboard/bookings/${booking.id}`
    );

    return ok({ ...booking, appliedReferralCode }, 201);
  } catch (e) {
    return catchError(e);
  }
}
