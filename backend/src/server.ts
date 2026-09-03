import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './logger/logger.js';
import { prisma, disconnectPrisma } from './database/prisma.js';
import { initSocketServer } from './websocket/socket.js';
import { startMonitoring, stopMonitoring } from './jobs/monitor-runner.js';

async function main(): Promise<void> {
  await prisma.$connect();
  logger.info({ event: 'database.connected' }, 'connected to postgres');

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
