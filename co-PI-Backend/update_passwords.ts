import 'dotenv/config';
import bcrypt from 'bcrypt';
import { prisma } from './src/db';

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
