"use server";

import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/auth";
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

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
