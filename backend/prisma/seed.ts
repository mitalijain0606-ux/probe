import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await argon2.hash('Password123', { type: argon2.argon2id });

  const user = await prisma.user.upsert({
    where: { email: 'demo@urlwatch.dev' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@urlwatch.dev',
      passwordHash,
      role: 'USER',
    },
  });

  const seedUrls = [
    { url: 'https://www.google.com', label: 'Google' },
    { url: 'https://www.github.com', label: 'GitHub' },
    { url: 'https://en.wikipedia.org/wiki/Main_Page', label: 'Wikipedia' },
  ];

  for (const entry of seedUrls) {
    await prisma.monitoredUrl.upsert({
      where: { userId_url: { userId: user.id, url: entry.url } },
      update: {},
      create: {
        userId: user.id,
        url: entry.url,
        label: entry.label,
        stats: { create: {} },
      },
    });
  }

  console.log(`Seeded user ${user.email} with ${seedUrls.length} monitored URLs`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
