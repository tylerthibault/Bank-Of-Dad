import Link from "next/link";
import { createChild, setChildBalance, setChildPin } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const number = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatAmount(amountCents: number, currencyName: string) {
  return `${number.format(amountCents / 100)} ${currencyName}`;
}

export default async function ManageKidsPage() {
  const user = await requireUser();

  const family = await prisma.family.findUniqueOrThrow({
    where: { id: user.familyId },
    include: {
      children: {
        where: { familyId: user.familyId },
        include: {
          transactions: {
            where: { status: "POSTED" },
            select: { amountCents: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return (
    <main className="shell">
      <header className="topbar compact-topbar">
        <div>
          <Link className="back-link" href="/settings">
            ← Settings
          </Link>
          <p className="eyebrow">Family members</p>
          <h1>Manage kids</h1>
          <p className="subtle">Add kids and set their balances for {family.name}.</p>
        </div>
      </header>

      <section className="panel add-kid">
        <div>
          <h2>Add a kid</h2>
          <p className="subtle">
            You can optionally give them a starting balance when you create the account.
          </p>
        </div>

        <form action={createChild} className="inline-form add-kid-form">
          <input
            name="name"
            placeholder="Kid's name"
            maxLength={60}
            autoComplete="off"
            required
          />
          <input
            name="startingAmount"
            type="number"
            min="0"
            step="0.01"
            placeholder={`Starting ${family.currencyName}`}
          />
          <button type="submit">Add kid</button>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Current accounts</p>
            <h2>{family.children.length} kid{family.children.length === 1 ? "" : "s"}</h2>
          </div>
        </div>

        {family.children.length === 0 ? (
          <p className="subtle">No kid accounts yet.</p>
        ) : (
          <div className="manage-list">
            {family.children.map((child) => {
              const balanceCents = child.transactions.reduce(
                (sum, transaction) => sum + transaction.amountCents,
                0,
              );

              return (
                <div className="manage-kid-row" key={child.id}>
                  <div className="manage-kid-summary">
                    <div>
                      <strong>{child.name}</strong>
                      <span>{formatAmount(balanceCents, family.currencyName)}</span>
                    </div>
                    <Link className="text-link" href={`/kids/${child.id}`}>
                      View ledger
                    </Link>
                  </div>

                  <div className="kid-admin-controls">
                    <form action={setChildBalance} className="set-balance-form">
                      <input type="hidden" name="childId" value={child.id} />
                      <label>
                        Set balance
                        <input
                          name="balance"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={(balanceCents / 100).toFixed(2)}
                          required
                        />
                      </label>
                      <button type="submit">Set amount</button>
                    </form>

                    <form action={setChildPin} className="set-balance-form">
                      <input type="hidden" name="childId" value={child.id} />
                      <label>
                        {child.pinHash ? "Change 4-digit PIN" : "Set 4-digit PIN"}
                        <input
                          name="pin"
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]{4}"
                          minLength={4}
                          maxLength={4}
                          placeholder="••••"
                          autoComplete="new-password"
                          required
                        />
                      </label>
                      <button type="submit">
                        {child.pinHash ? "Change PIN" : "Set PIN"}
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
