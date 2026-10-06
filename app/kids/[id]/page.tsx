import Link from "next/link";
import { notFound } from "next/navigation";
import { addTransaction, voidTransaction } from "@/app/actions";
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

export default async function KidLedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const child = await prisma.child.findFirst({
    where: {
      id,
      familyId: user.familyId,
    },
    include: {
      family: {
        select: {
          currencyName: true,
          name: true,
        },
      },
      transactions: {
        orderBy: {
          transactedAt: "desc",
        },
      },
    },
  });

  if (!child || !child.family) {
    notFound();
  }

  const family = child.family;

  const posted = child.transactions.filter(
    (transaction) => transaction.status === "POSTED",
  );
  const balanceCents = posted.reduce(
    (sum, transaction) => sum + transaction.amountCents,
    0,
  );

  return (
    <main className="shell">
      <header className="topbar compact-topbar">
        <div>
          <Link className="back-link" href="/dashboard">
            ← Dashboard
          </Link>
          <p className="eyebrow">Kid ledger</p>
          <h1>{child.name}</h1>
          <p className="subtle">{family.name}</p>
        </div>

        <strong className={balanceCents < 0 ? "balance negative" : "balance"}>
          {formatAmount(balanceCents, family.currencyName)}
        </strong>
      </header>

      <section className="panel ledger-add">
        <div>
          <p className="eyebrow">New entry</p>
          <h2>Add transaction</h2>
        </div>

        <form action={addTransaction} className="transaction-form">
          <input type="hidden" name="childId" value={child.id} />

          <label>
            Type
            <select name="kind" defaultValue="deposit">
              <option value="deposit">Add money</option>
              <option value="withdrawal">Spend money</option>
            </select>
          </label>

          <label>
            Amount ({family.currencyName})
            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="10.00"
              required
            />
          </label>

          <label className="description-field">
            Description
            <input
              name="description"
              placeholder="Allowance, snack, birthday..."
              maxLength={120}
            />
          </label>

          <button type="submit">Save transaction</button>
        </form>
      </section>

      <section className="panel ledger-panel">
        <div className="history-heading">
          <h2>Ledger</h2>
          <span>{child.transactions.length}</span>
        </div>

        {child.transactions.length === 0 ? (
          <p className="subtle">No transactions yet.</p>
        ) : (
          <div className="transaction-list">
            {child.transactions.map((transaction) => (
              <div
                className={
                  transaction.status === "VOIDED"
                    ? "transaction voided"
                    : "transaction"
                }
                key={transaction.id}
              >
                <div className="transaction-copy">
                  <strong>{transaction.description}</strong>
                  <span>
                    {transaction.transactedAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {transaction.source === "KID_DEVICE" ? " · Kid entry" : ""}
                    {transaction.status === "VOIDED" ? " · Voided" : ""}
                  </span>
                </div>

                <div className="transaction-right">
                  <strong
                    className={
                      transaction.amountCents < 0 ? "negative" : "positive"
                    }
                  >
                    {transaction.amountCents > 0 ? "+" : ""}
                    {formatAmount(
                      transaction.amountCents,
                      family.currencyName,
                    )}
                  </strong>

                  {transaction.status === "POSTED" ? (
                    <form action={voidTransaction}>
                      <input
                        type="hidden"
                        name="transactionId"
                        value={transaction.id}
                      />
                      <button type="submit" className="text-button">
                        Void
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
