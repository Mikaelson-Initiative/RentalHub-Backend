import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");
    if (!propertyId) return fail("propertyId is required");

    const reviews = await prisma.review.findMany({
      where: { propertyId },
      include: { student: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
    });

    const avg = reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

    return ok({ reviews, avg: Math.round(avg * 10) / 10, count: reviews.length });
  } catch (e) {
    return catchError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, "STUDENT");
    const { propertyId, rating, comment } = await req.json();

    if (!propertyId || !rating) return fail("propertyId and rating are required");
    if (rating < 1 || rating > 5) return fail("Rating must be between 1 and 5");

    // Student must have a confirmed + moved-in booking for this property
    const booking = await prisma.booking.findFirst({
      where: { studentId: auth.userId, propertyId, movedInConfirmedAt: { not: null } },
    });
    if (!booking) return fail("You can only review a property after confirming move-in");

    const existing = await prisma.review.findUnique({
      where: { studentId_propertyId: { studentId: auth.userId, propertyId } },
    });
    if (existing) return fail("You have already reviewed this property");

    const review = await prisma.review.create({
      data: { studentId: auth.userId, propertyId, rating: Math.round(rating), comment: comment?.trim() || null },
      include: { student: { select: { id: true, name: true, avatarUrl: true } } },
    });

    return ok(review, 201);
  } catch (e) {
    return catchError(e);
  }
}
