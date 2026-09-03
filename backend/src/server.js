const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { startMonitoringScheduler, stopMonitoringScheduler } = require('./jobs/monitorCron');

const server = app.listen(config.port, () => {
  logger.info({
    event: 'server_startup',
    port: config.port,
    environment: config.nodeEnv,
    message: `HealthWatch Observability API listening on port ${config.port}`,
  });

  // Start scheduled health check cron
  startMonitoringScheduler();

  // Ensure demo user exists in deployed environment
  ensureDemoUser();
});

async function ensureDemoUser() {
  try {
    const prisma = require('./utils/prisma');
    const bcrypt = require('bcryptjs');
    const demo = await prisma.user.findUnique({ where: { email: 'demo@healthwatch.io' } });
    if (!demo) {
      const passwordHash = await bcrypt.hash('demoPass123!', 10);
      await prisma.user.create({
        data: {
          email: 'demo@healthwatch.io',
          passwordHash,
        },
      });
      logger.info({ event: 'demo_user_auto_seeded', email: 'demo@healthwatch.io' });
    }
  } catch (err) {
    logger.warn({ event: 'demo_user_seed_check_skipped', error: err.message });
  }
}

// Graceful shutdown handling
function handleShutdown(signal) {
  logger.info({ event: 'server_shutdown_initiated', signal });
  stopMonitoringScheduler();

  server.close(() => {
    logger.info({ event: 'server_shutdown_completed' });
    process.exit(0);
  });

  // Force close if still lingering after 10s
  setTimeout(() => {
    logger.error({ event: 'server_shutdown_timeout_forced' });
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = server;
