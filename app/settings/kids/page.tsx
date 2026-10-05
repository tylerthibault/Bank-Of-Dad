import Link from "next/link";
import { createChild } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ManageKidsPage() {
  const user = await requireUser();

  const family = await prisma.family.findUniqueOrThrow({
    where: { id: user.familyId },
    include: {
      children: {
        where: { familyId: user.familyId },
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
          <p className="subtle">Add a kid account to {family.name}.</p>
        </div>
      </header>

      <section className="panel add-kid">
        <div>
          <h2>Add a kid</h2>
          <p className="subtle">
            New kid accounts start with a zero balance.
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
            {family.children.map((child) => (
              <div className="manage-row" key={child.id}>
                <strong>{child.name}</strong>
                <Link className="text-link" href={`/kids/${child.id}`}>
                  View ledger
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
