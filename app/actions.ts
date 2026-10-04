"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createChild(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return;
  }

  await prisma.child.create({
    data: { name },
  });

  revalidatePath("/");
}

export async function addTransaction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const kind = String(formData.get("kind") ?? "deposit");
  const amount = Number(formData.get("amount"));
  const description = String(formData.get("description") ?? "").trim();

  if (!childId || !Number.isFinite(amount) || amount <= 0) {
    return;
  }

  const amountCents = Math.round(amount * 100) * (kind === "withdrawal" ? -1 : 1);

  await prisma.transaction.create({
    data: {
      childId,
      amountCents,
      description: description || (kind === "withdrawal" ? "Withdrawal" : "Deposit"),
    },
  });

  revalidatePath("/");
}

export async function voidTransaction(formData: FormData) {
  const transactionId = String(formData.get("transactionId") ?? "");

  if (!transactionId) {
    return;
  }

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { status: "VOIDED" },
  });

  revalidatePath("/");
}
