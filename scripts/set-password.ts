import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error("Usage: npx tsx scripts/set-password.ts <email> <password>");
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.update({
    where: { email },
    data: { password: hashed },
    select: { email: true, name: true },
  });

  console.log(`Password set for ${user.name} (${user.email})`);
  await prisma.$disconnect();
}

main().catch(console.error);
