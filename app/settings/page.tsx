import Link from "next/link";
import { updateCurrencyName } from "@/app/actions";
import { changePasswordAction, logoutAction } from "@/app/auth-actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatFamilyCode(code: string) {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const family = await prisma.family.findUniqueOrThrow({
    where: { id: user.familyId },
    select: {
      id: true,
      name: true,
      code: true,
      currencyName: true,
      _count: {
        select: {
          children: true,
          users: true,
          devices: true,
        },
      },
    },
  });

  return (
    <main className="shell">
      <header className="topbar compact-topbar">
        <div>
          <Link className="back-link" href="/dashboard">
            ← Dashboard
          </Link>
          <p className="eyebrow">Bank of Dad</p>
          <h1>Settings</h1>
          <p className="subtle">Manage the parts of {family.name} that do not change every day.</p>
        </div>

        <form action={logoutAction}>
          <button className="secondary-button" type="submit">
            Log out
          </button>
        </form>
      </header>

      {params.error ? <div className="alert error">{params.error}</div> : null}
      {params.success ? <div className="alert success">{params.success}</div> : null}

      <section className="settings-grid">
        <article className="panel settings-card">
          <p className="eyebrow">Display</p>
          <h2>Currency name</h2>
          <p className="subtle">
            This is only the label shown beside balances. Changing it does not convert any money.
          </p>

          <form action={updateCurrencyName} className="stack compact-stack">
            <label>
              Currency name
              <input
                name="currencyName"
                defaultValue={family.currencyName}
                placeholder="Credits, Dollars, Tokens..."
                maxLength={32}
                autoComplete="off"
                required
              />
            </label>
            <button type="submit">Save currency name</button>
          </form>
        </article>

        <article className="panel settings-card">
          <p className="eyebrow">Account security</p>
          <h2>Change password</h2>
          <p className="subtle">
            Enter your current password and choose a new one. Other signed-in parent sessions
            for your account will be logged out.
          </p>
          <form action={changePasswordAction} className="stack compact-stack">
            <label>
              Current password
              <input name="currentPassword" type="password" autoComplete="current-password" required />
            </label>
            <label>
              New password
              <input name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
            </label>
            <label>
              Confirm new password
              <input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
            </label>
            <button type="submit">Change password</button>
          </form>
        </article>

        <article className="panel settings-card family-code-card">
          <p className="eyebrow">Family access</p>
          <h2>{formatFamilyCode(family.code)}</h2>
          <p className="subtle">
            Share this family code with another parent so they can create their own login and join this family.
          </p>
        </article>

        <Link className="panel settings-link-card" href="/settings/kids">
          <div>
            <p className="eyebrow">Family members</p>
            <h2>Manage kids</h2>
            <p className="subtle">Add kids and view the accounts in this family.</p>
          </div>
          <span>{family._count.children} kid{family._count.children === 1 ? "" : "s"} →</span>
        </Link>

        <Link className="panel settings-link-card" href="/settings/parents">
          <div>
            <p className="eyebrow">Family access</p>
            <h2>Manage parents</h2>
            <p className="subtle">See who has access and how another parent can join.</p>
          </div>
          <span>{family._count.users} parent{family._count.users === 1 ? "" : "s"} →</span>
        </Link>

        <Link className="panel settings-link-card" href="/settings/devices">
          <div>
            <p className="eyebrow">Wall dashboard</p>
            <h2>Registered devices</h2>
            <p className="subtle">
              Approve wall displays and revoke devices that should no longer stay signed in.
            </p>
          </div>
          <span>{family._count.devices} device{family._count.devices === 1 ? "" : "s"} →</span>
        </Link>
      </section>
    </main>
  );
}
