import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";
import { ok, fail, catchError } from "@/lib/res";

function isValidMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
  // JPEG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
  // PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return true;
  // WEBP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return true;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return fail("No file provided");
    if (file.size > 10 * 1024 * 1024) return fail("File size must be under 10MB");

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isValidMagicBytes(buffer)) {
      return fail("Invalid file type. Only genuine PNG, JPEG, WEBP, and PDF files are allowed.");
    }

    const url = await uploadImage(buffer);

    return ok({ name: file.name, type: "image", mimeType: file.type, size: file.size, url }, 201);
  } catch (e) {
    return catchError(e);
  }
}
