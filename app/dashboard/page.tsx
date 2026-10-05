import Link from "next/link";
import { addTransaction } from "@/app/actions";
import { logoutAction } from "@/app/auth-actions";
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

export default async function DashboardPage() {
  const user = await requireUser();

  const family = await prisma.family.findUniqueOrThrow({
    where: { id: user.familyId },
    include: {
      children: {
        where: { familyId: user.familyId },
        include: {
          transactions: {
            orderBy: { transactedAt: "desc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Bank of Dad</p>
          <h1>{family.name}</h1>
          <p className="subtle">Your kids&apos; money at a glance.</p>
        </div>

        <div className="header-actions">
          <Link className="button-link secondary-button" href="/settings">
            Settings
          </Link>
          <form action={logoutAction}>
            <button className="secondary-button" type="submit">
              Log out
            </button>
          </form>
        </div>
      </header>

      {family.children.length === 0 ? (
        <section className="empty panel">
          <h2>No kid accounts yet</h2>
          <p className="subtle">
            Add your first kid from Settings → Manage kids.
          </p>
          <Link className="button-link" href="/settings/kids">
            Manage kids
          </Link>
        </section>
      ) : (
        <section className="kid-grid">
          {family.children.map((child) => {
            const posted = child.transactions.filter(
              (transaction) => transaction.status === "POSTED",
            );
            const balanceCents = posted.reduce(
              (sum, transaction) => sum + transaction.amountCents,
              0,
            );

            return (
              <article className="kid-card" key={child.id}>
                <div className="kid-card-top">
                  <div>
                    <p className="eyebrow">Kid account</p>
                    <h2>{child.name}</h2>
                  </div>

                  <strong className={balanceCents < 0 ? "balance negative" : "balance"}>
                    {formatAmount(balanceCents, family.currencyName)}
                  </strong>
                </div>

                <div className="kid-card-actions">
                  <details className="quick-transaction">
                    <summary>Add transaction</summary>
                    <form action={addTransaction} className="quick-transaction-form">
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

                      <label>
                        Description
                        <input
                          name="description"
                          placeholder="Allowance, snack, birthday..."
                          maxLength={120}
                        />
                      </label>

                      <button type="submit">Save transaction</button>
                    </form>
                  </details>

                  <Link className="button-link secondary-button" href={`/kids/${child.id}`}>
                    View ledger
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
