import {
  addTransaction,
  createChild,
  updateCurrencyName,
  voidTransaction,
} from "@/app/actions";
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

function formatFamilyCode(code: string) {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

export default async function DashboardPage() {
  const user = await requireUser();

  const family = await prisma.family.findUniqueOrThrow({
    where: { id: user.familyId },
    include: {
      users: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
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
          <p className="subtle">Signed in as {user.name}</p>
        </div>

        <form action={logoutAction}>
          <button className="secondary-button" type="submit">
            Log out
          </button>
        </form>
      </header>

      <section className="family-grid">
        <article className="panel family-code-card">
          <div>
            <p className="eyebrow">Family code</p>
            <h2>{formatFamilyCode(family.code)}</h2>
            <p className="subtle">
              Give this code to another parent. They can choose &quot;Join a family&quot;
              on the registration page.
            </p>
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Parents</p>
          <h2>{family.users.length} parent{family.users.length === 1 ? "" : "s"}</h2>
          <div className="parent-list">
            {family.users.map((parent) => (
              <div className="parent-chip" key={parent.id}>
                <strong>{parent.name}</strong>
                <span>{parent.email}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel settings-panel">
        <div>
          <p className="eyebrow">Display settings</p>
          <h2>Currency name</h2>
          <p className="subtle">
            This is only a label. Changing it never converts or changes balances.
          </p>
        </div>

        <form action={updateCurrencyName} className="inline-form">
          <input
            name="currencyName"
            defaultValue={family.currencyName}
            placeholder="Dollars, Credits, Tokens..."
            maxLength={32}
            autoComplete="off"
            required
          />
          <button type="submit">Save name</button>
        </form>
      </section>

      <section className="panel add-kid">
        <div>
          <p className="eyebrow">Kids</p>
          <h2>Add a kid</h2>
          <p className="subtle">
            Every parent in this family will see the same kids and balances.
          </p>
        </div>

        <form action={createChild} className="inline-form">
          <input
            name="name"
            placeholder="Kid's name"
            maxLength={60}
            autoComplete="off"
            required
          />
          <button type="submit">Add account</button>
        </form>
      </section>

      {family.children.length === 0 ? (
        <section className="empty panel">
          <h2>No kid accounts yet</h2>
          <p>
            Add the first kid above. Their balance will start at{" "}
            {formatAmount(0, family.currencyName)}.
          </p>
        </section>
      ) : (
        <section className="accounts">
          {family.children.map((child) => {
            const posted = child.transactions.filter(
              (transaction) => transaction.status === "POSTED",
            );
            const balanceCents = posted.reduce(
              (sum, transaction) => sum + transaction.amountCents,
              0,
            );

            return (
              <article className="account-card" key={child.id}>
                <div className="account-heading">
                  <div>
                    <p className="eyebrow">Kid account</p>
                    <h2>{child.name}</h2>
                  </div>

                  <strong className={balanceCents < 0 ? "balance negative" : "balance"}>
                    {formatAmount(balanceCents, family.currencyName)}
                  </strong>
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

                  <button type="submit">Add transaction</button>
                </form>

                <div className="history">
                  <div className="history-heading">
                    <h3>Transactions</h3>
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
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
