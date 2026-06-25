import "server-only";
import { NextResponse } from "next/server";

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export function catchError(e: unknown) {
  const err = e as { status?: number; message?: string };
  const status = err.status ?? 500;
  const message = status < 500 ? (err.message ?? "Error") : "Server error";
  if (status >= 500) console.error(e);
  return fail(message, status);
}
