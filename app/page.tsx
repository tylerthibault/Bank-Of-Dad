import { addTransaction, createChild, voidTransaction } from "@/app/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default async function Home() {
  const children = await prisma.child.findMany({
    include: {
      transactions: {
        orderBy: { transactedAt: "desc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Family ledger</p>
          <h1>Bank of Dad</h1>
          <p className="subtle">Keep track of what the kids have, without the spreadsheet.</p>
        </div>
      </header>

      <section className="panel add-kid">
        <div>
          <h2>Add a kid</h2>
          <p className="subtle">Create an account, then start adding deposits and withdrawals.</p>
        </div>
        <form action={createChild} className="inline-form">
          <input name="name" placeholder="Name" autoComplete="off" required />
          <button type="submit">Add account</button>
        </form>
      </section>

      {children.length === 0 ? (
        <section className="empty panel">
          <h2>No accounts yet</h2>
          <p>Add the first kid above and their balance will start at $0.00.</p>
        </section>
      ) : (
        <section className="accounts">
          {children.map((child) => {
            const posted = child.transactions.filter((transaction) => transaction.status === "POSTED");
            const balanceCents = posted.reduce((sum, transaction) => sum + transaction.amountCents, 0);

            return (
              <article className="account-card" key={child.id}>
                <div className="account-heading">
                  <div>
                    <p className="eyebrow">Account</p>
                    <h2>{child.name}</h2>
                  </div>
                  <strong className={balanceCents < 0 ? "balance negative" : "balance"}>
                    {money.format(balanceCents / 100)}
                  </strong>
                </div>

                <form action={addTransaction} className="transaction-form">
                  <input type="hidden" name="childId" value={child.id} />
                  <label>
                    Type
                    <select name="kind" defaultValue="deposit">
                      <option value="deposit">Deposit</option>
                      <option value="withdrawal">Withdrawal</option>
                    </select>
                  </label>
                  <label>
                    Amount
                    <input name="amount" type="number" min="0.01" step="0.01" placeholder="10.00" required />
                  </label>
                  <label className="description-field">
                    Description
                    <input name="description" placeholder="Allowance, snack, birthday..." />
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
                          className={transaction.status === "VOIDED" ? "transaction voided" : "transaction"}
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
                            <strong className={transaction.amountCents < 0 ? "negative" : "positive"}>
                              {transaction.amountCents > 0 ? "+" : ""}
                              {money.format(transaction.amountCents / 100)}
                            </strong>
                            {transaction.status === "POSTED" && (
                              <form action={voidTransaction}>
                                <input type="hidden" name="transactionId" value={transaction.id} />
                                <button type="submit" className="text-button">Void</button>
                              </form>
                            )}
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
