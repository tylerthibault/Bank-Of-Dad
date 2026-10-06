"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  clearDeviceCookie,
  createDeviceToken,
  getApprovedDevice,
  getRegisteredDevice,
  setDeviceCookie,
} from "@/lib/device-auth";

function normalizeFamilyCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function requestDeviceRegistration(formData: FormData) {
  const familyCode = normalizeFamilyCode(
    String(formData.get("familyCode") ?? ""),
  );
  const deviceName =
    String(formData.get("deviceName") ?? "").trim().slice(0, 60) ||
    "Wall Dashboard";

  if (familyCode.length !== 8) {
    fail("/wall", "Enter a valid family code.");
  }

  const family = await prisma.family.findUnique({
    where: { code: familyCode },
    select: { id: true },
  });

  if (!family) {
    fail("/wall", "That family code was not found.");
  }

  const existingDevice = await getRegisteredDevice();

  if (existingDevice && existingDevice.status !== "REVOKED") {
    redirect("/wall");
  }

  const { token, tokenHash } = createDeviceToken();

  await prisma.registeredDevice.create({
    data: {
      familyId: family.id,
      name: deviceName,
      tokenHash,
      status: "PENDING",
    },
  });

  await setDeviceCookie(token);
  redirect("/wall");
}

export async function approveDevice(formData: FormData) {
  const user = await requireUser();
  const deviceId = String(formData.get("deviceId") ?? "");

  if (!deviceId) {
    return;
  }

  await prisma.registeredDevice.updateMany({
    where: {
      id: deviceId,
      familyId: user.familyId,
      status: "PENDING",
    },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });

  revalidatePath("/settings/devices");
}

export async function rejectDevice(formData: FormData) {
  const user = await requireUser();
  const deviceId = String(formData.get("deviceId") ?? "");

  if (!deviceId) {
    return;
  }

  await prisma.registeredDevice.deleteMany({
    where: {
      id: deviceId,
      familyId: user.familyId,
      status: "PENDING",
    },
  });

  revalidatePath("/settings/devices");
}

export async function revokeDevice(formData: FormData) {
  const user = await requireUser();
  const deviceId = String(formData.get("deviceId") ?? "");

  if (!deviceId) {
    return;
  }

  await prisma.registeredDevice.updateMany({
    where: {
      id: deviceId,
      familyId: user.familyId,
      status: "APPROVED",
    },
    data: {
      status: "REVOKED",
    },
  });

  revalidatePath("/settings/devices");
}

export async function clearWallDevice() {
  await clearDeviceCookie();
  redirect("/wall");
}

export async function wallTransaction(formData: FormData) {
  const device = await getApprovedDevice();

  if (!device) {
    redirect("/wall");
  }

  const childId = String(formData.get("childId") ?? "");
  const pin = String(formData.get("pin") ?? "").trim();
  const kind = String(formData.get("kind") ?? "withdrawal");
  const amount = Number(formData.get("amount"));
  const description = String(formData.get("description") ?? "").trim().slice(0, 120);

  if (!childId || !/^\d{4}$/.test(pin)) {
    fail(`/wall/kids/${childId}`, "Enter a 4-digit authorization PIN.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    fail(`/wall/kids/${childId}`, "Enter a valid amount.");
  }

  if (kind !== "withdrawal" && kind !== "deposit") {
    fail(`/wall/kids/${childId}`, "Choose a valid transaction type.");
  }

  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      familyId: device.familyId,
    },
    select: {
      id: true,
      pinHash: true,
    },
  });

  if (!child) {
    redirect("/wall");
  }

  let source: "KID_DEVICE" | "PARENT_DEVICE";

  if (kind === "withdrawal") {
    if (!child.pinHash) {
      fail(
        `/wall/kids/${child.id}`,
        "A parent needs to set a kid PIN before this account can spend money.",
      );
    }

    const validKidPin = await bcrypt.compare(pin, child.pinHash);

    if (!validKidPin) {
      fail(`/wall/kids/${child.id}`, "Incorrect kid PIN.");
    }

    source = "KID_DEVICE";
  } else {
    const parents = await prisma.user.findMany({
      where: {
        familyId: device.familyId,
        pinHash: {
          not: null,
        },
      },
      select: {
        pinHash: true,
      },
    });

    if (parents.length === 0) {
      fail(
        `/wall/kids/${child.id}`,
        "A parent needs to set a parent PIN before money can be added from this device.",
      );
    }

    let validParentPin = false;

    for (const parent of parents) {
      if (parent.pinHash && (await bcrypt.compare(pin, parent.pinHash))) {
        validParentPin = true;
        break;
      }
    }

    if (!validParentPin) {
      fail(`/wall/kids/${child.id}`, "Incorrect parent PIN.");
    }

    source = "PARENT_DEVICE";
  }

  const amountCents =
    Math.round(amount * 100) * (kind === "withdrawal" ? -1 : 1);

  await prisma.transaction.create({
    data: {
      childId: child.id,
      deviceId: device.id,
      source,
      amountCents,
      description:
        description ||
        (kind === "withdrawal" ? "Kid purchase" : "Parent-authorized deposit"),
    },
  });

  revalidatePath("/wall");
  revalidatePath(`/wall/kids/${child.id}`);
  revalidatePath("/dashboard");
  revalidatePath(`/kids/${child.id}`);

  redirect(`/wall/kids/${child.id}?success=1`);
}
