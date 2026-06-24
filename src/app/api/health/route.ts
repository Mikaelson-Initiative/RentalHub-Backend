import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 10;

export async function GET(_req: NextRequest) {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "ok", latency: Date.now() - start });
  } catch (e) {
    return Response.json(
      { status: "error", db: "unreachable", error: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    );
  }
}
