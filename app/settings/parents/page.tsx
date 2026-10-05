import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatFamilyCode(code: string) {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

export default async function ManageParentsPage() {
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
    },
  });

  return (
    <main className="shell">
      <header className="topbar compact-topbar">
        <div>
          <Link className="back-link" href="/settings">
            ← Settings
          </Link>
          <p className="eyebrow">Family access</p>
          <h1>Manage parents</h1>
          <p className="subtle">See who can manage {family.name}.</p>
        </div>
      </header>

      <section className="family-grid">
        <article className="panel family-code-card">
          <p className="eyebrow">Invite another parent</p>
          <h2>{formatFamilyCode(family.code)}</h2>
          <p className="subtle">
            Have the other parent open Bank of Dad, choose “Create or join a family,”
            then enter this code under “Join a family.”
          </p>
        </article>

        <article className="panel">
          <p className="eyebrow">Current access</p>
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
    </main>
  );
}
