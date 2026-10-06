import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/auth-actions";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark">BD</div>
        <p className="eyebrow">Bank of Dad</p>
        <h1>Parent login</h1>
        <p className="subtle">
          Sign in to manage your family, kids, balances, and transactions.
        </p>

        {params.error ? <div className="alert error">{params.error}</div> : null}

        <form action={loginAction} className="stack">
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit">Log in</button>
        </form>

        <div className="login-secondary-actions">
          <Link className="button-link secondary-button" href="/wall">
            Register device
          </Link>
        </div>

        <p className="auth-footer">
          Need a parent account? <Link href="/register">Create or join a family</Link>
        </p>
      </section>
    </main>
  );
}
