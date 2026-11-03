import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "bank_of_dad_session";

export function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set and at least 32 characters long.");
  }

  return new TextEncoder().encode(secret);
}

export async function createSession(userId: string, sessionVersion = 0) {
  const token = await new SignJWT({ purpose: "session", userId, sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getAuthSecret());

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getAuthSecret(), { algorithms: ["HS256"] });
    const userId = typeof payload.userId === "string" ? payload.userId : null;
    const sessionVersion = payload.sessionVersion === undefined ? 0 : payload.sessionVersion;

    // Older session cookies are accepted until the password changes.
    // Password recovery tokens must never be valid as login sessions.
    if (
      !userId ||
      (payload.purpose !== "session" && payload.purpose !== undefined) ||
      !Number.isSafeInteger(sessionVersion) ||
      Number(sessionVersion) < 0
    ) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { family: true },
    });

    return user && user.sessionVersion === sessionVersion ? user : null;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
