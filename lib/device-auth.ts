import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const DEVICE_COOKIE = "bank_of_dad_device";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createDeviceToken() {
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashToken(token),
  };
}

export async function setDeviceCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(DEVICE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearDeviceCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(DEVICE_COOKIE);
}

export async function getRegisteredDevice() {
  const cookieStore = await cookies();
  const token = cookieStore.get(DEVICE_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return prisma.registeredDevice.findUnique({
    where: {
      tokenHash: hashToken(token),
    },
    include: {
      family: true,
    },
  });
}

export async function getApprovedDevice() {
  const device = await getRegisteredDevice();

  if (!device || device.status !== "APPROVED") {
    return null;
  }

  await prisma.registeredDevice.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date() },
  });

  return device;
}
