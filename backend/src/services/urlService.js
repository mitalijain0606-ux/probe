const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const { validateUrlForSsrf } = require('../utils/ssrfValidator');
const { executeCheckForUrl, checkMultipleUrlsConcurrently } = require('./healthCheckService');

/**
 * Calculates check-based uptime percentage.
 * Formula: (successful checks / total checks) * 100
 */
function calculateUptimePercentage(checks) {
  if (!checks || checks.length === 0) return 100;
  const successful = checks.filter(c => c.status === 'UP').length;
  return Number(((successful / checks.length) * 100).toFixed(1));
}

/**
 * Calculates average response time in ms for a list of checks.
 */
function calculateAvgResponseTime(checks) {
  if (!checks || checks.length === 0) return 0;
  const total = checks.reduce((sum, c) => sum + (c.responseTime || 0), 0);
  return Math.round(total / checks.length);
}

/**
 * Retrieves all monitored URLs for a specific user with enriched status and metrics.
 */
async function getUserUrls(userId) {
  const urls = await prisma.monitoredURL.findMany({
    where: { userId },
    include: {
      checkResults: {
        orderBy: { checkedAt: 'desc' },
        take: 100, // sample recent 100 checks for metrics
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return urls.map(item => {
    const checks = item.checkResults || [];
    const latestCheck = checks[0] || null;
    const uptimePercentage = calculateUptimePercentage(checks);
    const failureCount = checks.filter(c => c.status === 'DOWN').length;
    const avgResponseTime = calculateAvgResponseTime(checks);

    return {
      id: item.id,
      name: item.name,
      url: item.url,
      checkInterval: item.checkInterval,
      isActive: item.isActive,
      alertEnabled: item.alertEnabled,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      currentStatus: latestCheck ? latestCheck.status : 'PENDING',
      statusCode: latestCheck ? latestCheck.statusCode : null,
      responseTime: latestCheck ? latestCheck.responseTime : null,
      lastCheckedAt: latestCheck ? latestCheck.checkedAt : null,
      errorMessage: latestCheck ? latestCheck.errorMessage : null,
      uptimePercentage,
      avgResponseTime,
      totalChecks: checks.length,
      failureCount,
    };
  });
}

/**
 * Creates a new monitored URL and runs an immediate initial health check.
 */
async function createMonitoredUrl(userId, data) {
  const { name, url, checkInterval = 5, alertEnabled = true } = data;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    const error = new Error('URL name is required');
    error.status = 400;
    throw error;
  }

  const ssrfCheck = validateUrlForSsrf(url);
  if (!ssrfCheck.valid) {
    const error = new Error(ssrfCheck.error || 'Invalid URL or blocked by security policy');
    error.status = 400;
    throw error;
  }

  const interval = parseInt(checkInterval, 10);
  if (isNaN(interval) || interval < 1 || interval > 1440) {
    const error = new Error('Check interval must be an integer between 1 and 1440 minutes');
    error.status = 400;
    throw error;
  }

  const newUrl = await prisma.monitoredURL.create({
    data: {
      userId,
      name: name.trim(),
      url: url.trim(),
      checkInterval: interval,
      alertEnabled: Boolean(alertEnabled),
    },
    include: {
      user: { select: { email: true } },
    },
  });

  logger.info({
    event: 'url_creation',
    userId,
    urlId: newUrl.id,
    name: newUrl.name,
    targetUrl: newUrl.url,
  });

  // Trigger non-blocking initial check
  executeCheckForUrl(newUrl).catch(err => {
    logger.error({ event: 'initial_check_error', urlId: newUrl.id, error: err.message });
  });

  return newUrl;
}

/**
 * Retrieves a single URL by ID ensuring user ownership.
 */
async function getUrlById(userId, urlId) {
  const item = await prisma.monitoredURL.findFirst({
    where: { id: urlId, userId },
    include: {
      checkResults: {
        orderBy: { checkedAt: 'desc' },
        take: 100,
      },
    },
  });

  if (!item) {
    const error = new Error('Monitored URL not found');
    error.status = 404;
    throw error;
  }

  const checks = item.checkResults || [];
  const latestCheck = checks[0] || null;
  const uptimePercentage = calculateUptimePercentage(checks);
  const failureCount = checks.filter(c => c.status === 'DOWN').length;
  const avgResponseTime = calculateAvgResponseTime(checks);

  return {
    id: item.id,
    name: item.name,
    url: item.url,
    checkInterval: item.checkInterval,
    isActive: item.isActive,
    alertEnabled: item.alertEnabled,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    currentStatus: latestCheck ? latestCheck.status : 'PENDING',
    statusCode: latestCheck ? latestCheck.statusCode : null,
    responseTime: latestCheck ? latestCheck.responseTime : null,
    lastCheckedAt: latestCheck ? latestCheck.checkedAt : null,
    errorMessage: latestCheck ? latestCheck.errorMessage : null,
    uptimePercentage,
    avgResponseTime,
    totalChecks: checks.length,
    failureCount,
    recentChecks: checks.slice(0, 50),
  };
}

/**
 * Retrieves full check result history for a single URL.
 */
async function getUrlHistory(userId, urlId, limit = 50) {
  const item = await prisma.monitoredURL.findFirst({
    where: { id: urlId, userId },
  });

  if (!item) {
    const error = new Error('Monitored URL not found');
    error.status = 404;
    throw error;
  }

  const history = await prisma.checkResult.findMany({
    where: { urlId },
    orderBy: { checkedAt: 'desc' },
    take: Math.min(parseInt(limit, 10) || 50, 200),
  });

  return history;
}

/**
 * Deletes a monitored URL and cascades to check results.
 */
async function deleteMonitoredUrl(userId, urlId) {
  const item = await prisma.monitoredURL.findFirst({
    where: { id: urlId, userId },
  });

  if (!item) {
    const error = new Error('Monitored URL not found');
    error.status = 404;
    throw error;
  }

  await prisma.monitoredURL.delete({
    where: { id: urlId },
  });

  logger.info({
    event: 'url_deletion',
    userId,
    urlId,
    name: item.name,
  });

  return { id: urlId, message: 'URL successfully deleted' };
}

/**
 * Triggers a manual health check for a specific URL.
 */
async function manualCheckUrl(userId, urlId) {
  const monitoredUrl = await prisma.monitoredURL.findFirst({
    where: { id: urlId, userId },
    include: {
      user: { select: { email: true } },
    },
  });

  if (!monitoredUrl) {
    const error = new Error('Monitored URL not found');
    error.status = 404;
    throw error;
  }

  const checkResult = await executeCheckForUrl(monitoredUrl);

  return {
    status: checkResult.status,
    statusCode: checkResult.statusCode,
    responseTime: checkResult.responseTime,
    errorMessage: checkResult.errorMessage,
    checkedAt: checkResult.checkedAt,
  };
}

/**
 * Imports a batch of URLs from a JSON array.
 * Supports:
 * - Objects: [{ "name": "Google", "url": "https://google.com" }]
 * - Raw string array: ["https://google.com", "https://github.com"]
 */
async function importUrlsFromJson(userId, urlList) {
  if (!Array.isArray(urlList) || urlList.length === 0) {
    const error = new Error('Expected a non-empty array of URL entries');
    error.status = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  const createdUrls = [];
  const errors = [];

  for (let i = 0; i < urlList.length; i++) {
    const entry = urlList[i];
    let name;
    let rawUrl;
    let checkInterval = 5;
    let alertEnabled = true;

    if (typeof entry === 'string') {
      rawUrl = entry.trim();
      try {
        const u = new URL(rawUrl);
        name = u.hostname;
      } catch (e) {
        name = `URL ${i + 1}`;
      }
    } else if (typeof entry === 'object' && entry !== null) {
      rawUrl = entry.url;
      name = entry.name || (rawUrl ? new URL(rawUrl).hostname : `URL ${i + 1}`);
      if (entry.checkInterval) checkInterval = parseInt(entry.checkInterval, 10) || 5;
      if (typeof entry.alertEnabled === 'boolean') alertEnabled = entry.alertEnabled;
    } else {
      errors.push({ index: i, error: 'Invalid entry format: must be an object or URL string' });
      continue;
    }

    // Validation
    const ssrfCheck = validateUrlForSsrf(rawUrl);
    if (!ssrfCheck.valid) {
      errors.push({
        index: i,
        url: rawUrl,
        error: ssrfCheck.error || 'Invalid or prohibited URL',
      });
      continue;
    }

    try {
      const record = await prisma.monitoredURL.create({
        data: {
          userId,
          name: name.trim(),
          url: rawUrl.trim(),
          checkInterval,
          alertEnabled,
        },
      });
      // Attach user object for alert notifications
      record.user = { email: user?.email };
      createdUrls.push(record);
    } catch (err) {
      errors.push({
        index: i,
        url: rawUrl,
        error: err.message,
      });
    }
  }

  // Trigger concurrent initial checks for successfully created URLs
  if (createdUrls.length > 0) {
    checkMultipleUrlsConcurrently(createdUrls).catch(err => {
      logger.error({ event: 'import_batch_initial_check_error', error: err.message });
    });
  }

  logger.info({
    event: 'url_import_completed',
    userId,
    importedCount: createdUrls.length,
    failedCount: errors.length,
  });

  return {
    importedCount: createdUrls.length,
    failedCount: errors.length,
    createdUrls: createdUrls.map(u => ({ id: u.id, name: u.name, url: u.url })),
    errors,
  };
}

module.exports = {
  getUserUrls,
  createMonitoredUrl,
  getUrlById,
  getUrlHistory,
  deleteMonitoredUrl,
  manualCheckUrl,
  importUrlsFromJson,
  calculateUptimePercentage,
  calculateAvgResponseTime,
};
