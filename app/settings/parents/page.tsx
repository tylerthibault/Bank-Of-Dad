import Link from "next/link";
import { setParentPin } from "@/app/actions";
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
          pinHash: true,
        },
      },
    },
  });

  const currentParent = family.users.find((parent) => parent.id === user.id);

  return (
    <main className="shell">
      <header className="topbar compact-topbar">
        <div>
          <Link className="back-link" href="/settings">
            ← Settings
          </Link>
          <p className="eyebrow">Family access</p>
          <h1>Manage parents</h1>
          <p className="subtle">See who can manage {family.name} and set your wall-dashboard PIN.</p>
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
          <p className="eyebrow">Your parent PIN</p>
          <h2>{currentParent?.pinHash ? "PIN set" : "No PIN set"}</h2>
          <p className="subtle">
            Your 4-digit parent PIN authorizes adding money from a registered wall device.
          </p>

          <form action={setParentPin} className="stack compact-stack">
            <label>
              {currentParent?.pinHash ? "Change 4-digit PIN" : "Set 4-digit PIN"}
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
              {currentParent?.pinHash ? "Change PIN" : "Set PIN"}
            </button>
          </form>
        </article>
      </section>

      <section className="panel">
        <p className="eyebrow">Current access</p>
        <h2>{family.users.length} parent{family.users.length === 1 ? "" : "s"}</h2>

        <div className="parent-list">
          {family.users.map((parent) => (
            <div className="parent-chip" key={parent.id}>
              <div className="parent-access-copy">
                <strong>
                  {parent.name}
                  {parent.id === user.id ? " (you)" : ""}
                </strong>
                <span>{parent.email}</span>
              </div>
              <span className={parent.pinHash ? "status-pill ready" : "status-pill"}>
                {parent.pinHash ? "Parent PIN set" : "No parent PIN"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
