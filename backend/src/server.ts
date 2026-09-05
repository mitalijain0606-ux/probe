import { createServer } from 'node:http';
import argon2 from 'argon2';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './logger/logger.js';
import { prisma, disconnectPrisma } from './database/prisma.js';
import { initSocketServer } from './websocket/socket.js';
import { startMonitoring, stopMonitoring } from './jobs/monitor-runner.js';

async function main(): Promise<void> {
  await prisma.$connect();
  logger.info({ event: 'database.connected' }, 'connected to postgres');

  // Auto-seed admin user on startup
  try {
    const adminEmail = 'admin@urlwatch.dev';
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existing) {
      const passwordHash = await argon2.hash('Admin@123', { type: argon2.argon2id });
      await prisma.user.create({
        data: {
          name: 'System Admin',
          email: adminEmail,
          passwordHash,
          role: 'ADMIN',
        },
      });
      logger.info({ event: 'admin.seeded', email: adminEmail }, 'seeded admin account');
    } else {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: 'ADMIN' },
      });
    }

    // Also promote piyu@gmail.com to ADMIN so current user has admin access
    await prisma.user.updateMany({
      where: { email: 'piyu@gmail.com' },
      data: { role: 'ADMIN' },
    });
  } catch (err) {
    logger.warn({ event: 'admin.seed_error', message: (err as Error).message });
  }

  const app = createApp();
  const httpServer = createServer(app);
  initSocketServer(httpServer);

  startMonitoring();

  httpServer.listen(env.PORT, env.HOST, () => {
    logger.info({ event: 'server.started', port: env.PORT, env: env.NODE_ENV }, 'api server listening');
  });

  const shutdown = async (signal: string) => {
    logger.info({ event: 'server.shutdown', signal }, 'shutting down gracefully');
    stopMonitoring();
    httpServer.close();
    await disconnectPrisma();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error({ event: 'server.startup_failed', message: (error as Error).message }, 'failed to start server');
  process.exit(1);
});
