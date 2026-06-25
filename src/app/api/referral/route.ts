import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";
import { randomBytes } from "crypto";

function generateCode(name: string): string {
  const slug = name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5).padEnd(3, "X");
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `${slug}-${rand}`;
}

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req, "LANDLORD");

    let referral = await prisma.referral.findFirst({
      where: { referrerId: auth.userId },
      orderBy: { createdAt: "asc" },
    });

    if (!referral) {
      const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { name: true } });
      const code = generateCode(user?.name ?? "HOST");
      referral = await prisma.referral.create({
        data: { code, referrerId: auth.userId },
      });
    }

    const usedCount = await prisma.referral.count({
      where: { referrerId: auth.userId, usedById: { not: null } },
    });

    return ok({ code: referral.code, usedCount });
  } catch (e) {
    return catchError(e);
  }
}

// Validate a code (used by student before booking)
export async function POST(req: NextRequest) {
  try {
    requireAuth(req, "STUDENT");
    const { code } = await req.json();
    if (!code) return fail("code is required");

    const referral = await prisma.referral.findUnique({ where: { code: code.toUpperCase() } });
    if (!referral) return fail("Referral code not found", 404);
    if (referral.usedById) return fail("This referral code has already been used");

    return ok({ valid: true, discountPct: 5, code: referral.code });
  } catch (e) {
    return catchError(e);
  }
}
