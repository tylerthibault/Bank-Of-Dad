import Link from "next/link";
import {
  approveDevice,
  rejectDevice,
  revokeDevice,
} from "@/app/device-actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  if (!date) {
    return "Never";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function DevicesPage() {
  const user = await requireUser();

  const devices = await prisma.registeredDevice.findMany({
    where: {
      familyId: user.familyId,
      status: {
        in: ["PENDING", "APPROVED"],
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const pending = devices.filter((device) => device.status === "PENDING");
  const approved = devices.filter((device) => device.status === "APPROVED");

  return (
    <main className="shell">
      <header className="topbar compact-topbar">
        <div>
          <Link className="back-link" href="/settings">
            ← Settings
          </Link>
          <p className="eyebrow">Wall dashboard</p>
          <h1>Registered devices</h1>
          <p className="subtle">
            A wall device first enters your family code. It stays locked until a
            parent approves it here.
          </p>
        </div>
      </header>

      <section className="panel device-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Waiting for approval</p>
            <h2>{pending.length} pending</h2>
          </div>
        </div>

        {pending.length === 0 ? (
          <p className="subtle">No devices are waiting for approval.</p>
        ) : (
          <div className="manage-list">
            {pending.map((device) => (
              <div className="device-row" key={device.id}>
                <div>
                  <strong>{device.name}</strong>
                  <span>Requested {formatDate(device.createdAt)}</span>
                </div>

                <div className="device-actions">
                  <form action={approveDevice}>
                    <input type="hidden" name="deviceId" value={device.id} />
                    <button type="submit">Approve</button>
                  </form>

                  <form action={rejectDevice}>
                    <input type="hidden" name="deviceId" value={device.id} />
                    <button className="secondary-button" type="submit">
                      Deny
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel device-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Approved</p>
            <h2>{approved.length} registered device{approved.length === 1 ? "" : "s"}</h2>
          </div>
        </div>

        {approved.length === 0 ? (
          <p className="subtle">No wall devices have been approved yet.</p>
        ) : (
          <div className="manage-list">
            {approved.map((device) => (
              <div className="device-row" key={device.id}>
                <div>
                  <strong>{device.name}</strong>
                  <span>
                    Approved {formatDate(device.approvedAt)} · Last seen{" "}
                    {formatDate(device.lastSeenAt)}
                  </span>
                </div>

                <form action={revokeDevice}>
                  <input type="hidden" name="deviceId" value={device.id} />
                  <button className="secondary-button" type="submit">
                    Revoke
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
