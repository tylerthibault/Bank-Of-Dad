import Link from "next/link";
import { resetPasswordAction } from "@/app/auth-actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark">BD</div>
        <p className="eyebrow">Bank of Dad</p>
        <h1>Reset password</h1>
        <p className="subtle">
          Enter the one-time recovery code from the application server terminal
          and choose a new password.
        </p>

        {params.error ? <div className="alert error">{params.error}</div> : null}

        <form action={resetPasswordAction} className="stack">
          <label>
            Recovery code
            <input
              name="token"
              type="password"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </label>
          <label>
            New password
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
          </label>
          <label>
            Confirm new password
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
          </label>
          <button type="submit">Reset password</button>
        </form>

        <p className="auth-footer">
          Need a code? <Link href="/forgot-password">Recovery instructions</Link>
        </p>
      </section>
    </main>
  );
}
