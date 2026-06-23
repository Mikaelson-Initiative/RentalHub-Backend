import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, catchError } from "@/lib/res";

export async function GET(req: NextRequest) {
  try {
    const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });
    return ok(locations);
  } catch (e) {
    return catchError(e);
  }
}
