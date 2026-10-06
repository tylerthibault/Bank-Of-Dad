import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { wallTransaction } from "@/app/device-actions";
import { getApprovedDevice } from "@/lib/device-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const number = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatAmount(amountCents: number, currencyName: string) {
  return `${number.format(amountCents / 100)} ${currencyName}`;
}

export default async function WallKidPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const device = await getApprovedDevice();

  if (!device) {
    redirect("/wall");
  }

  const { id } = await params;
  const query = await searchParams;

  const child = await prisma.child.findFirst({
    where: {
      id,
      familyId: device.familyId,
    },
    include: {
      family: {
        select: {
          name: true,
          currencyName: true,
          users: {
            where: {
              pinHash: {
                not: null,
              },
            },
            select: {
              id: true,
            },
          },
        },
      },
      transactions: {
        orderBy: {
          transactedAt: "desc",
        },
        take: 12,
      },
    },
  });

  if (!child || !child.family) {
    notFound();
  }

  const family = child.family;

  const postedTransactions = await prisma.transaction.findMany({
    where: {
      childId: child.id,
      status: "POSTED",
    },
    select: {
      amountCents: true,
    },
  });

  const balanceCents = postedTransactions.reduce(
    (sum, transaction) => sum + transaction.amountCents,
    0,
  );

  return (
    <main className="wall-shell">
      <header className="wall-account-header">
        <div>
          <Link className="wall-back-link" href="/wall">
            ← All accounts
          </Link>
          <p className="eyebrow">{family.name}</p>
          <h1>{child.name}</h1>
        </div>

        <div className="wall-balance-block">
          <span>Current balance</span>
          <strong className={balanceCents < 0 ? "wall-balance negative" : "wall-balance"}>
            {formatAmount(balanceCents, family.currencyName)}
          </strong>
        </div>
      </header>

      <section className="wall-account-grid">
        <article className="wall-transaction-card">
          <p className="eyebrow">New transaction</p>
          <h2>Update your account</h2>
          <p className="subtle">
            Spending requires {child.name}&apos;s kid PIN. Adding money requires a parent PIN.
          </p>

          {query.error ? <div className="alert error">{query.error}</div> : null}
          {query.success ? (
            <div className="alert success">Transaction saved.</div>
          ) : null}

          {!child.pinHash ? (
            <div className="wall-instructions">
              Kid spending is currently locked because a parent has not set a kid PIN yet.
            </div>
          ) : null}

          {family.users.length === 0 ? (
            <div className="wall-instructions">
              Adding money is currently locked because no parent has set a parent PIN yet.
            </div>
          ) : null}

          <form action={wallTransaction} className="wall-transaction-form">
            <input type="hidden" name="childId" value={child.id} />

            <label>
              Transaction
              <select name="kind" defaultValue="withdrawal">
                <option value="withdrawal">Spend money — kid PIN</option>
                <option value="deposit">Add money — parent PIN</option>
              </select>
            </label>

            <label>
              Amount ({family.currencyName})
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                required
              />
            </label>

            <label>
              What was it for?
              <input
                name="description"
                placeholder="Movie, snack, chore money..."
                maxLength={120}
                autoComplete="off"
              />
            </label>

            <label>
              Authorization PIN
              <input
                name="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                minLength={4}
                maxLength={4}
                placeholder="••••"
                autoComplete="off"
                required
              />
              <span className="field-help">
                Kid PIN for spending. Parent PIN for adding money.
              </span>
            </label>

            <button type="submit">Save transaction</button>
          </form>
        </article>

        <article className="wall-ledger-card">
          <div className="wall-ledger-heading">
            <div>
              <p className="eyebrow">Recent activity</p>
              <h2>Ledger</h2>
            </div>
            <span>Latest 12</span>
          </div>

          {child.transactions.length === 0 ? (
            <p className="subtle">No transactions yet.</p>
          ) : (
            <div className="wall-ledger-list">
              {child.transactions.map((transaction) => (
                <div
                  className={
                    transaction.status === "VOIDED"
                      ? "wall-ledger-row voided"
                      : "wall-ledger-row"
                  }
                  key={transaction.id}
                >
                  <div>
                    <strong>{transaction.description}</strong>
                    <span>
                      {transaction.transactedAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      {transaction.source === "KID_DEVICE" ? " · Kid entry" : ""}
                      {transaction.source === "PARENT_DEVICE" ? " · Parent-approved wall entry" : ""}
                      {transaction.status === "VOIDED" ? " · Voided" : ""}
                    </span>
                  </div>

                  <strong
                    className={
                      transaction.amountCents < 0 ? "negative" : "positive"
                    }
                  >
                    {transaction.amountCents > 0 ? "+" : ""}
                    {formatAmount(transaction.amountCents, family.currencyName)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
