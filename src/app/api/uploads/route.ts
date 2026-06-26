import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";
import { ok, fail, catchError } from "@/lib/res";

export async function POST(req: NextRequest) {
  try {
    requireAuth(req);
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return fail("No file provided");
    const allowed = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!allowed) return fail("Only image and PDF files are allowed");
    if (file.size > 10 * 1024 * 1024) return fail("File size must be under 10MB");

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadImage(buffer);

    return ok({ name: file.name, type: "image", mimeType: file.type, size: file.size, url }, 201);
  } catch (e) {
    return catchError(e);
  }
}
