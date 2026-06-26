import "server-only";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { ok, fail, catchError } from "@/lib/res";

export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json();
    if (!accessToken) return fail("accessToken is required.", 400);

    // Verify the access token and fetch user info from Google.
    const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!infoRes.ok) return fail("Invalid Google access token.", 401);

    const info = await infoRes.json() as {
      sub: string;
      email: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    const { sub: googleId, email, name, picture: avatarUrl } = info;
    if (!email || !googleId) return fail("Could not retrieve account details from Google.", 401);

    // Find by googleId first, then fall back to email (links existing accounts).
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    let isNewUser = false;

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: name?.trim() || email.split("@")[0],
          email,
          googleId,
          avatarUrl: avatarUrl ?? null,
          emailVerified: true,
        },
      });
      isNewUser = true;
    } else {
      const patch: Record<string, unknown> = { emailVerified: true };
      if (!user.googleId) patch.googleId = googleId;
      if (!user.avatarUrl && avatarUrl) patch.avatarUrl = avatarUrl;
      await prisma.user.update({ where: { id: user.id }, data: patch });
    }

    if (user.isFrozen) return fail("Your account has been suspended.", 403);

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    return ok({
      token,
      isNewUser,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        verificationStatus: user.verificationStatus,
        avatarUrl: user.avatarUrl ?? null,
      },
    });
  } catch (e) {
    return catchError(e);
  }
}
