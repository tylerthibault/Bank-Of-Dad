-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "currencyName" TEXT NOT NULL DEFAULT 'Dollars',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- Seed the singleton settings row
INSERT INTO "AppSettings" ("id", "currencyName", "updatedAt")
VALUES (1, 'Dollars', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
