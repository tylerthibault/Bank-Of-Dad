"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function updateCurrencyName(formData: FormData) {
  const user = await requireUser();
  const currencyName = String(formData.get("currencyName") ?? "").trim().slice(0, 32);

  if (!currencyName) {
    return;
  }

  await prisma.family.update({
    where: { id: user.familyId },
    data: { currencyName },
  });

  revalidatePath("/dashboard");
}

export async function createChild(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);

  if (!name) {
    return;
  }

  await prisma.child.create({
    data: {
      name,
      familyId: user.familyId,
    },
  });

  revalidatePath("/dashboard");
}

export async function addTransaction(formData: FormData) {
  const user = await requireUser();
  const childId = String(formData.get("childId") ?? "");
  const kind = String(formData.get("kind") ?? "deposit");
  const amount = Number(formData.get("amount"));
  const description = String(formData.get("description") ?? "").trim();

  if (!childId || !Number.isFinite(amount) || amount <= 0) {
    return;
  }

  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      familyId: user.familyId,
    },
    select: { id: true },
  });

  if (!child) {
    return;
  }

  const amountCents = Math.round(amount * 100) * (kind === "withdrawal" ? -1 : 1);

  await prisma.transaction.create({
    data: {
      childId: child.id,
      amountCents,
      description: description || (kind === "withdrawal" ? "Withdrawal" : "Deposit"),
    },
  });

  revalidatePath("/dashboard");
}

export async function voidTransaction(formData: FormData) {
  const user = await requireUser();
  const transactionId = String(formData.get("transactionId") ?? "");

  if (!transactionId) {
    return;
  }

  const transaction = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      child: {
        familyId: user.familyId,
      },
    },
    select: { id: true },
  });

  if (!transaction) {
    return;
  }

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { status: "VOIDED" },
  });

  revalidatePath("/dashboard");
}
