import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis.");
  }
  if (password.length < 6) {
    throw new Error("ADMIN_PASSWORD doit contenir au moins 6 caractères.");
  }

  const passwordHash = await hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      displayName: "Administratrice",
      role: UserRole.ADMIN,
    },
    update: {
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log(`Compte administrateur prêt : ${email}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
