import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const email = process.argv[2]?.trim().toLowerCase();
const secret = process.env.AUTH_SECRET;

if (!email || !email.includes("@")) {
  console.error("Usage: npm run password:recovery -- parent@example.com");
  process.exit(1);
}

if (!secret || secret.length < 32) {
  console.error("AUTH_SECRET must be set and at least 32 characters long.");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, sessionVersion: true },
  });

  if (!user) {
    console.error("No parent account exists for that email address.");
    process.exitCode = 1;
  } else {
    const token = await new SignJWT({
      purpose: "password-reset",
      userId: user.id,
      sessionVersion: user.sessionVersion,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(new TextEncoder().encode(secret));

    console.log("\nOne-time password recovery code (expires in 15 minutes):\n");
    console.log(token);
    console.log("\nOpen /reset-password in Bank of Dad, paste the code and choose a new password.");
    console.log("Do not share this code. It becomes invalid immediately after a successful reset.\n");
  }
} catch {
  console.error("Unable to generate a recovery code. Check your database connection and application deployment.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
