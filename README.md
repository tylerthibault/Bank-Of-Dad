# Bank of Dad

A small, self-hosted family ledger for tracking virtual money for kids.

## Stack

- Next.js + TypeScript
- PostgreSQL
- Prisma
- Docker / Coolify

## Current MVP

- Add kids
- See each kid's current balance
- Add deposits and withdrawals
- View transaction history
- Void transactions without erasing the audit trail
- Rename the display currency at any time (for example: Dollars, Credits, Tokens)
- Money is stored as integer cents to avoid floating-point rounding issues

The currency name is cosmetic only. Changing it relabels all displayed balances and transactions without converting or modifying any stored amounts.

> Parent authentication is available. Keep the app behind an appropriate access layer (for example, Twingate) and protect the Coolify administration console.

## Local setup

1. Copy `.env.example` to `.env`
2. Set `DATABASE_URL`
3. Install dependencies:
   ```bash
   npm install
   ```
4. Apply the database migration:
   ```bash
   npm run db:deploy
   ```
5. Start development:
   ```bash
   npm run dev
   ```

## Coolify setup

1. Add a PostgreSQL resource in Coolify.
2. Create an application from this GitHub repository.
3. Build with the included `Dockerfile`.
4. Add the PostgreSQL connection string as `DATABASE_URL`.
5. Deploy.

The container runs `prisma migrate deploy` automatically before starting Next.js.


## Password changes and recovery (no email required)

- A signed-in parent can open **Settings → Change password**, enter their current password, and choose a new one.
- If locked out, select **Forgot password?** on the login page.
- A server administrator opens a terminal **inside the running Bank of Dad application container** in Coolify and runs:

  ```bash
  npm run password:recovery -- parent@example.com
  ```

- The command prints a signed, 15-minute recovery code. Copy it into **I have a recovery code** in the application and set a new password. The code is single-use: using it updates the user's session version, invalidating the code and all earlier login sessions.
- Treat the code as a secret. Do not paste it into chats or screenshots. Recovery codes are never emailed, and the website itself cannot generate them.
- The application container needs `DATABASE_URL` and `AUTH_SECRET` (minimum 32 characters). No email provider or new environment variable is required.
- A new `User.sessionVersion` field defaults to 0 and is created by the existing `prisma db push` startup command. The matching SQL migration is included for deployments using Prisma migrations.

Only administrators with access to the deployed application's environment and database can generate recovery codes; normal website visitors cannot reset an account just by knowing its email.
