"use server";

import bcrypt from "bcryptjs";
import { jwtVerify } from "jose";
import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getAuthSecret, requireUser } from "@/lib/auth";
import { broadcastFamily } from "@/lib/realtime";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function normalizeFamilyCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function generateFamilyCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    let code = "";

    for (let index = 0; index < 8; index += 1) {
      code += CODE_CHARS[randomInt(CODE_CHARS.length)];
    }

    const existing = await prisma.family.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error("Unable to generate a unique family code.");
}

function validateParent(name: string, email: string, password: string, path: string) {
  if (name.length < 2 || name.length > 60) {
    fail(path, "Enter your name.");
  }

  if (!email.includes("@") || email.length > 200) {
    fail(path, "Enter a valid email address.");
  }

  if (password.length < 8) {
    fail(path, "Password must be at least 8 characters.");
  }
}

export async function registerCreateFamilyAction(formData: FormData) {
  if (process.env.ALLOW_REGISTRATION === "false") {
    fail("/register", "Creating new families is currently disabled.");
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const familyName = String(formData.get("familyName") ?? "").trim();

  validateParent(name, email, password, "/register");

  if (familyName.length < 2 || familyName.length > 60) {
    fail("/register", "Family name must be between 2 and 60 characters.");
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    fail("/register", "An account with that email already exists.");
  }

  const [passwordHash, code] = await Promise.all([
    bcrypt.hash(password, 12),
    generateFamilyCode(),
  ]);

  const user = await prisma.$transaction(async (tx) => {
    const existingFamilyCount = await tx.family.count();

    const legacySettings =
      existingFamilyCount === 0
        ? await tx.appSettings.findUnique({
            where: { id: 1 },
            select: { currencyName: true },
          })
        : null;

    const family = await tx.family.create({
      data: {
        name: familyName,
        code,
        currencyName: legacySettings?.currencyName || "Credits",
      },
    });

    if (existingFamilyCount === 0) {
      await tx.child.updateMany({
        where: { familyId: null },
        data: { familyId: family.id },
      });
    }

    return tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        familyId: family.id,
      },
    });
  });

  await createSession(user.id);
  redirect("/dashboard");
}

export async function registerJoinFamilyAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const code = normalizeFamilyCode(String(formData.get("familyCode") ?? ""));

  validateParent(name, email, password, "/register");

  if (code.length !== 8) {
    fail("/register", "Enter a valid family code.");
  }

  const [existing, family] = await Promise.all([
    prisma.user.findUnique({
      where: { email },
      select: { id: true },
    }),
    prisma.family.findUnique({
      where: { code },
      select: { id: true },
    }),
  ]);

  if (existing) {
    fail("/register", "An account with that email already exists.");
  }

  if (!family) {
    fail("/register", "That family code was not found.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      familyId: family.id,
    },
  });

  broadcastFamily(family.id);
  await createSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    fail("/login", "Email or password is incorrect.");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    fail("/login", "Email or password is incorrect.");
  }

  await createSession(user.id, user.sessionVersion);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}


function passwordInputError(password: string, confirmation: string) {
  if (password.length < 8 || password.length > 128) {
    return "Password must be between 8 and 128 characters.";
  }

  if (password !== confirmation) {
    return "The new passwords do not match.";
  }

  return null;
}

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmation = String(formData.get("confirmPassword") ?? "");

  const inputError = passwordInputError(newPassword, confirmation);
  if (inputError) {
    fail("/settings", inputError);
  }

  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    fail("/settings", "Current password is incorrect.");
  }

  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    fail("/settings", "Choose a different password.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const update = await prisma.user.updateMany({
    where: { id: user.id, sessionVersion: user.sessionVersion },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });

  if (update.count !== 1) {
    fail("/settings", "Your account changed. Please sign in again and retry.");
  }

  // Keep this browser signed in while revoking older sessions on other devices.
  await createSession(user.id, user.sessionVersion + 1);
  redirect("/settings?success=Password%20changed.");
}

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmation = String(formData.get("confirmPassword") ?? "");

  const inputError = passwordInputError(newPassword, confirmation);
  if (inputError) {
    fail("/reset-password", inputError);
  }

  if (!token || token.length > 4096) {
    fail("/reset-password", "Invalid or expired recovery code.");
  }

  let userId: string;
  let sessionVersion: number;

  try {
    const { payload } = await jwtVerify(token, getAuthSecret(), {
      algorithms: ["HS256"],
    });

    if (
      payload.purpose !== "password-reset" ||
      typeof payload.userId !== "string" ||
      !Number.isSafeInteger(payload.sessionVersion) ||
      Number(payload.sessionVersion) < 0
    ) {
      fail("/reset-password", "Invalid or expired recovery code.");
    }

    userId = payload.userId as string;
    sessionVersion = payload.sessionVersion as number;
  } catch {
    fail("/reset-password", "Invalid or expired recovery code.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const update = await prisma.user.updateMany({
    where: { id: userId, sessionVersion },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });

  if (update.count !== 1) {
    fail("/reset-password", "Invalid or expired recovery code.");
  }

  await destroySession();
  redirect("/login?success=Password%20reset.%20Please%20log%20in.");
}
