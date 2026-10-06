"use server";

import bcrypt from "bcryptjs";
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
  revalidatePath("/settings");
}

export async function createChild(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const startingAmount = Number(formData.get("startingAmount") ?? 0);

  if (!name || !Number.isFinite(startingAmount) || startingAmount < 0) {
    return;
  }

  const startingAmountCents = Math.round(startingAmount * 100);

  await prisma.$transaction(async (tx) => {
    const child = await tx.child.create({
      data: {
        name,
        familyId: user.familyId,
      },
    });

    if (startingAmountCents > 0) {
      await tx.transaction.create({
        data: {
          childId: child.id,
          amountCents: startingAmountCents,
          description: "Starting balance",
        },
      });
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/settings/kids");
}

export async function setChildBalance(formData: FormData) {
  const user = await requireUser();
  const childId = String(formData.get("childId") ?? "");
  const targetAmount = Number(formData.get("balance"));

  if (!childId || !Number.isFinite(targetAmount) || targetAmount < 0) {
    return;
  }

  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      familyId: user.familyId,
    },
    select: {
      id: true,
      transactions: {
        where: { status: "POSTED" },
        select: { amountCents: true },
      },
    },
  });

  if (!child) {
    return;
  }

  const currentBalanceCents = child.transactions.reduce(
    (sum, transaction) => sum + transaction.amountCents,
    0,
  );
  const targetBalanceCents = Math.round(targetAmount * 100);
  const adjustmentCents = targetBalanceCents - currentBalanceCents;

  if (adjustmentCents !== 0) {
    await prisma.transaction.create({
      data: {
        childId: child.id,
        amountCents: adjustmentCents,
        description: "Balance adjustment",
      },
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings/kids");
  revalidatePath(`/kids/${child.id}`);
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
  revalidatePath(`/kids/${child.id}`);
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
    select: {
      id: true,
      childId: true,
    },
  });

  if (!transaction) {
    return;
  }

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { status: "VOIDED" },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/kids/${transaction.childId}`);
}


export async function setChildPin(formData: FormData) {
  const user = await requireUser();
  const childId = String(formData.get("childId") ?? "");
  const pin = String(formData.get("pin") ?? "").trim();

  if (!childId || !/^\d{4}$/.test(pin)) {
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

  const pinHash = await bcrypt.hash(pin, 12);

  await prisma.child.update({
    where: { id: child.id },
    data: { pinHash },
  });

  revalidatePath("/settings/kids");
  revalidatePath("/wall");
}


export async function setParentPin(formData: FormData) {
  const user = await requireUser();
  const pin = String(formData.get("pin") ?? "").trim();

  if (!/^\d{4}$/.test(pin)) {
    return;
  }

  const pinHash = await bcrypt.hash(pin, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { pinHash },
  });

  revalidatePath("/settings/parents");
}
