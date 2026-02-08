import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
    },
  });

  console.log('Admin par défaut créé (identifiant: admin)');

  const existingGlobalStock = await prisma.storage.findFirst({
    where: { isGlobalStock: true },
  });

  if (!existingGlobalStock) {
    await prisma.storage.create({
      data: {
        name: 'Réserve locale',
        isGlobalStock: true,
      },
    });
    console.log('Réserve locale créée');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
