import { PrismaClient } from '@prisma/client';
import { env, isProduction } from '../config/env.js';
import { logger } from '../logger/logger.js';

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    log: isProduction ? ['warn', 'error'] : ['warn', 'error'],
    datasources: { db: { url: env.DATABASE_URL } },
  });

if (!isProduction) globalThis.__prisma = prisma;

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  logger.info({ event: 'database.disconnected' }, 'prisma disconnected');
}
