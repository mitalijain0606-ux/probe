const bcrypt = require('bcryptjs');
const prisma = require('../src/utils/prisma');

async function main() {
  console.log('Seeding database...');

  const demoEmail = 'demo@healthwatch.io';
  const demoPassword = 'demoPass123!';

  let demoUser = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (!demoUser) {
    const passwordHash = await bcrypt.hash(demoPassword, 10);
    demoUser = await prisma.user.create({
      data: {
        email: demoEmail,
        passwordHash,
      },
    });
    console.log(`Created demo user: ${demoEmail}`);
  } else {
    console.log(`Demo user ${demoEmail} already exists.`);
  }

  // Seed initial sample URLs for the demo user if none exist
  const existingUrls = await prisma.monitoredURL.count({
    where: { userId: demoUser.id },
  });

  if (existingUrls === 0) {
    console.log('Adding initial sample monitored URLs for demo user...');
    const urlsToCreate = [
      {
        name: 'GitHub API Health',
        url: 'https://api.github.com',
        checkInterval: 1,
        isActive: true,
        alertEnabled: true,
      },
      {
        name: 'Cloudflare DNS',
        url: 'https://1.1.1.1',
        checkInterval: 5,
        isActive: true,
        alertEnabled: true,
      },
      {
        name: 'Google Public Web',
        url: 'https://www.google.com',
        checkInterval: 5,
        isActive: true,
        alertEnabled: true,
      },
    ];

    for (const item of urlsToCreate) {
      await prisma.monitoredURL.create({
        data: {
          ...item,
          userId: demoUser.id,
        },
      });
    }
    console.log('Initial sample URLs created successfully.');
  }

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
