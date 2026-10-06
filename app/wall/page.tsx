import Link from "next/link";
import {
  clearWallDevice,
  requestDeviceRegistration,
} from "@/app/device-actions";
import {
  getApprovedDevice,
  getRegisteredDevice,
} from "@/lib/device-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const number = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatAmount(amountCents: number, currencyName: string) {
  return `${number.format(amountCents / 100)} ${currencyName}`;
}

export default async function WallPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const registered = await getRegisteredDevice();

  if (!registered || registered.status === "REVOKED") {
    return (
      <main className="wall-shell wall-centered">
        <section className="wall-pair-card">
          <div className="brand-mark wall-brand">BD</div>
          <p className="eyebrow">Bank of Dad</p>
          <h1>Register this device</h1>
          <p className="subtle">
            Enter your family code. A parent will need to approve this device
            before the wall dashboard opens.
          </p>

          {params.error ? <div className="alert error">{params.error}</div> : null}

          <form action={requestDeviceRegistration} className="stack wall-pair-form">
            <label>
              Device name
              <input
                name="deviceName"
                placeholder="Kitchen Wall Tablet"
                maxLength={60}
                autoComplete="off"
                required
              />
            </label>

            <label>
              Family code
              <input
                name="familyCode"
                placeholder="ABCD-7K9M"
                autoCapitalize="characters"
                autoComplete="off"
                maxLength={12}
                required
              />
            </label>

            <button type="submit">Request access</button>
          </form>
        </section>
      </main>
    );
  }

  if (registered.status === "PENDING") {
    return (
      <main className="wall-shell wall-centered">
        <section className="wall-pair-card">
          <div className="pending-icon">✓</div>
          <p className="eyebrow">Registration requested</p>
          <h1>Waiting for a parent</h1>
          <p className="subtle">
            <strong>{registered.name}</strong> is waiting for approval in{" "}
            <strong>{registered.family.name}</strong>.
          </p>

          <div className="wall-instructions">
            On a parent account, open <strong>Settings → Registered devices</strong>{" "}
            and approve this device.
          </div>

          <div className="wall-pending-actions">
            <Link className="button-link" href="/wall">
              Check again
            </Link>
            <form action={clearWallDevice}>
              <button className="secondary-button" type="submit">
                Start over
              </button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  const device = await getApprovedDevice();

  if (!device) {
    return null;
  }

  const family = await prisma.family.findUniqueOrThrow({
    where: { id: device.familyId },
    include: {
      children: {
        where: { familyId: device.familyId },
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
    <main className="wall-shell">
      <header className="wall-header">
        <div>
          <p className="eyebrow">Bank of Dad</p>
          <h1>{family.name}</h1>
        </div>
        <div className="wall-device-label">{device.name}</div>
      </header>

      {family.children.length === 0 ? (
        <section className="wall-empty">
          <h2>No kid accounts yet</h2>
          <p>A parent can add kids from Settings.</p>
        </section>
      ) : (
        <section className="wall-kid-grid">
          {family.children.map((child) => {
            const balanceCents = child.transactions.reduce(
              (sum, transaction) => sum + transaction.amountCents,
              0,
            );

            return (
              <Link
                className="wall-kid-card"
                href={`/wall/kids/${child.id}`}
                key={child.id}
              >
                <div>
                  <p className="eyebrow">Account</p>
                  <h2>{child.name}</h2>
                </div>

                <strong className={balanceCents < 0 ? "wall-balance negative" : "wall-balance"}>
                  {formatAmount(balanceCents, family.currencyName)}
                </strong>

                <span className="wall-open-account">Open account →</span>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
