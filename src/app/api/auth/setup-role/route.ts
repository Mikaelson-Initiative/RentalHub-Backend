import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";

export async function PATCH(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    const { role } = await req.json();

    if (role !== "STUDENT" && role !== "LANDLORD") {
      return fail("Role must be STUDENT or LANDLORD");
    }

    const user = await prisma.user.update({
      where: { id: auth.userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true, emailVerified: true, verificationStatus: true },
    });

    return ok(user);
  } catch (e) {
    return catchError(e);
  }
}
