import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark">BD</div>
        <p className="eyebrow">Bank of Dad</p>
        <h1>Forgot password?</h1>
        <p className="subtle">
          Bank of Dad runs on your own server and does not send recovery emails.
          An administrator with access to the Bank of Dad application container
          can generate a one-time recovery code.
        </p>

        <div className="wall-instructions">
          <strong>From your Coolify application terminal:</strong>
          <p>Run the following command, replacing the email with your parent login email:</p>
          <code>npm run password:recovery -- parent@example.com</code>
          <p>
            Copy the code the terminal prints. It expires after 15 minutes and can only
            be used once. Never share your recovery code.
          </p>
        </div>

        <div className="stack">
          <Link className="button-link" href="/reset-password">I have a recovery code</Link>
          <Link className="button-link secondary-button" href="/login">Back to login</Link>
        </div>
      </section>
    </main>
  );
}
