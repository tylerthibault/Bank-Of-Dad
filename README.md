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
- Money is stored as integer cents to avoid floating-point rounding issues

> Authentication is intentionally not included in the first scaffold. Keep the app private (for example, behind Twingate or another access layer) until parent login is added.

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
