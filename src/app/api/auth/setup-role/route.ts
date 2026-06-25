import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";
import { Role } from "@prisma/client";

export async function PATCH(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    const body = await req.json();
    const { role, campus } = body;

    if (role !== "STUDENT" && role !== "LANDLORD") {
      return fail("Role must be STUDENT or LANDLORD");
    }

    const updateData: { role: Role; campus?: string } = { role: role as Role };
    if (role === "LANDLORD" && typeof campus === "string" && campus.trim()) {
      updateData.campus = campus.trim();
    }

    const user = await prisma.user.update({
      where: { id: auth.userId },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, emailVerified: true, verificationStatus: true, campus: true },
    });

    return ok(user);
  } catch (e) {
    return catchError(e);
  }
}
