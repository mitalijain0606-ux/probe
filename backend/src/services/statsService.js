const prisma = require('../utils/prisma');

async function getDashboardStats(userId) {
  const urls = await prisma.monitoredURL.findMany({
    where: { userId },
    include: {
      checkResults: {
        orderBy: { checkedAt: 'desc' },
        take: 50,
      },
    },
  });

  const totalUrls = urls.length;
  let upCount = 0;
  let downCount = 0;
  let pendingCount = 0;

  let totalSuccessfulChecks = 0;
  let totalAllChecks = 0;
  let responseTimes = [];
  let totalFailures = 0;

  for (const item of urls) {
    const checks = item.checkResults || [];
    const latestCheck = checks[0];

    if (!latestCheck) {
      pendingCount++;
    } else if (latestCheck.status === 'UP') {
      upCount++;
    } else {
      downCount++;
    }

    for (const check of checks) {
      totalAllChecks++;
      if (check.status === 'UP') {
        totalSuccessfulChecks++;
      } else {
        totalFailures++;
      }
      if (check.responseTime > 0) {
        responseTimes.push(check.responseTime);
      }
    }
  }

  const overallUptime = totalAllChecks === 0
    ? 100
    : Number(((totalSuccessfulChecks / totalAllChecks) * 100).toFixed(1));

  const avgResponseTime = responseTimes.length === 0
    ? 0
    : Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);

  return {
    totalUrls,
    urlsUp: upCount,
    urlsDown: downCount,
    urlsPending: pendingCount,
    overallUptime,
    avgResponseTime,
    totalFailures,
  };
}

module.exports = {
  getDashboardStats,
};
