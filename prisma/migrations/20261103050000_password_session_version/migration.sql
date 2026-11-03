-- Invalidate previous login sessions when a parent changes or resets their password.
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
