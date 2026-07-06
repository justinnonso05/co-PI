import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('00000000', 10);
  await prisma.user.updateMany({
    data: {
      passwordHash: hashedPassword
    }
  });
  console.log('Successfully updated all user passwords to 00000000');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
