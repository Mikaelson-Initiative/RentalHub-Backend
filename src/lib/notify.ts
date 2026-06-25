import "server-only";
import { prisma } from "@/lib/prisma";

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string,
): Promise<void> {
  try {
    await prisma.notification.create({ data: { userId, type, title, body, link: link ?? null } });
  } catch (e) {
    console.error("createNotification failed:", e);
  }
}
