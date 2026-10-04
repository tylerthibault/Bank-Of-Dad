import Link from "next/link";
import { redirect } from "next/navigation";
import {
  registerCreateFamilyAction,
  registerJoinFamilyAction,
} from "@/app/auth-actions";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const newFamiliesDisabled = process.env.ALLOW_REGISTRATION === "false";

  return (
    <main className="auth-shell wide-auth">
      <section className="auth-heading">
        <div className="brand-mark">BD</div>
        <p className="eyebrow">Bank of Dad</p>
        <h1>Set up a parent account</h1>
        <p className="subtle">
          Create a new family or join an existing one using its family code.
        </p>
        {params.error ? <div className="alert error">{params.error}</div> : null}
      </section>

      <section className="auth-choice-grid">
        <article className="auth-card">
          <p className="eyebrow">New family</p>
          <h2>Create a family</h2>
          <p className="subtle">
            You will get a private family code that another parent can use to join.
          </p>

          {newFamiliesDisabled ? (
            <div className="alert error">
              Creating new families is currently disabled on this server.
            </div>
          ) : (
            <form action={registerCreateFamilyAction} className="stack">
              <label>
                Your name
                <input name="name" autoComplete="name" maxLength={60} required />
              </label>

              <label>
                Email
                <input name="email" type="email" autoComplete="email" required />
              </label>

              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>

              <label>
                Family name
                <input
                  name="familyName"
                  placeholder="The Thibault Family"
                  maxLength={60}
                  required
                />
              </label>

              <button type="submit">Create family</button>
            </form>
          )}
        </article>

        <article className="auth-card" id="join">
          <p className="eyebrow">Existing family</p>
          <h2>Join a family</h2>
          <p className="subtle">
            Enter the family code shown on the other parent&apos;s dashboard.
          </p>

          <form action={registerJoinFamilyAction} className="stack">
            <label>
              Your name
              <input name="name" autoComplete="name" maxLength={60} required />
            </label>

            <label>
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>

            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
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

            <button type="submit">Join family</button>
          </form>
        </article>
      </section>

      <p className="auth-footer centered">
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
