import "server-only";
import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireVerifiedInspector } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";

const ALLOWED_PURPOSES = new Set(["studentId", "portalScreenshot"]);
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function buildS3Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  return new S3Client({
    region: "auto",
    endpoint: accountId
      ? `https://${accountId}.r2.cloudflarestorage.com`
      : process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireVerifiedInspector(req);
    const { purpose, contentType, fileName } = await req.json();

    if (!ALLOWED_PURPOSES.has(purpose)) return fail("Invalid upload purpose.", 400);
    if (!ALLOWED_TYPES.has(contentType)) return fail("Only JPEG, PNG, WebP, and PDF files are accepted.", 400);

    const bucket = process.env.R2_BUCKET_NAME ?? process.env.AWS_S3_BUCKET;
    if (!bucket) return fail("Storage not configured.", 500);

    const ext = (fileName as string)?.split(".").pop()?.toLowerCase() ?? "bin";
    const nonce = randomBytes(16).toString("hex");
    const key = `inspectors/${auth.userId}/${purpose}-${nonce}.${ext}`;

    const client = buildS3Client();
    const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 }); // 15 min

    const publicBase = (process.env.R2_PUBLIC_URL ?? process.env.S3_PUBLIC_URL ?? "").replace(/\/$/, "");
    const publicUrl = `${publicBase}/${key}`;

    return ok({ uploadUrl, publicUrl, key });
  } catch (e) {
    return catchError(e);
  }
}
