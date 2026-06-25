import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";

export async function GET(req: NextRequest) {
  try {
    const campus = req.nextUrl.searchParams.get("campus") || undefined;
    const locations = await prisma.location.findMany({
      where: campus ? { campus } : undefined,
      orderBy: { name: "asc" },
    });
    return ok(locations);
  } catch (e) {
    return catchError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAuth(req, "ADMIN");
    const { name, campus } = await req.json() as { name?: string; campus?: string };
    if (!name?.trim() || !campus?.trim()) return fail("Name and campus are required.", 400);
    const location = await prisma.location.create({
      data: { name: name.trim(), campus: campus.trim(), classification: "Neighbourhood" },
    });
    return ok(location);
  } catch (e) {
    return catchError(e);
  }
}
