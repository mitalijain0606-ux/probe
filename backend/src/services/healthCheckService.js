const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const config = require('../config');
const { validateUrlForSsrf } = require('../utils/ssrfValidator');
const { sendDowntimeAlert, sendRecoveryAlert } = require('./emailService');

/**
 * Performs a single HTTP/HTTPS ping against a target URL.
 * Never throws an unhandled rejection.
 *
 * @param {string} targetUrl - URL to ping
 * @param {number} timeoutMs - Timeout limit in ms
 * @returns {Promise<{ status: 'UP' | 'DOWN', statusCode: number | null, responseTime: number, errorMessage: string | null }>}
 */
async function pingUrl(targetUrl, timeoutMs = config.monitoring.timeoutMs) {
  // 1. SSRF & URL validation
  const validation = validateUrlForSsrf(targetUrl);
  if (!validation.valid) {
    return {
      status: 'DOWN',
      statusCode: null,
      responseTime: 0,
      errorMessage: validation.error || 'Blocked by SSRF policy',
    };
  }

  const startTime = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'HealthWatch-Monitor/1.0 (+https://healthwatch.io)',
        'Accept': '*/*',
      },
      // Do not follow infinite redirects
      redirect: 'follow',
    });

    const endTime = performance.now();
    clearTimeout(timer);
    const responseTime = Math.round(endTime - startTime);

    const isUp = response.status >= 200 && response.status <= 299;

    return {
      status: isUp ? 'UP' : 'DOWN',
      statusCode: response.status,
      responseTime,
      errorMessage: isUp ? null : `HTTP status ${response.status} ${response.statusText || 'Error'}`,
    };
  } catch (err) {
    clearTimeout(timer);
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    let errorMessage = err.message || 'Unknown network error';

    if (err.name === 'AbortError' || err.code === 'ABORT_ERR') {
      errorMessage = `Request timed out after ${timeoutMs}ms`;
    } else if (err.cause?.code === 'ENOTFOUND' || err.message?.includes('ENOTFOUND')) {
      errorMessage = 'DNS lookup failed (domain not found)';
    } else if (err.cause?.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
      errorMessage = 'Connection refused by destination host';
    } else if (err.cause?.code === 'CERT_HAS_EXPIRED' || err.message?.includes('certificate')) {
      errorMessage = 'SSL/TLS Certificate verification error';
    }

    return {
      status: 'DOWN',
      statusCode: null,
      responseTime,
      errorMessage,
    };
  }
}

/**
 * Checks a specific MonitoredURL record, saves the CheckResult,
 * and triggers email alerts if state transitioned.
 *
 * @param {object} monitoredUrl - MonitoredURL record with user included
 * @returns {Promise<object>} Created CheckResult record
 */
async function executeCheckForUrl(monitoredUrl) {
  logger.info({
    event: 'health_check_started',
    urlId: monitoredUrl.id,
    urlName: monitoredUrl.name,
    targetUrl: monitoredUrl.url,
  });

  const checkStartTime = new Date();
  const pingResult = await pingUrl(monitoredUrl.url);

  // Retrieve previous check to determine state transition
  let previousCheck = null;
  try {
    previousCheck = await prisma.checkResult.findFirst({
      where: { urlId: monitoredUrl.id },
      orderBy: { checkedAt: 'desc' },
    });
  } catch (err) {
    logger.warn({
      event: 'previous_check_lookup_failed',
      urlId: monitoredUrl.id,
      error: err.message,
    });
  }

  // Persist check result in database
  let savedResult;
  try {
    savedResult = await prisma.checkResult.create({
      data: {
        urlId: monitoredUrl.id,
        status: pingResult.status,
        statusCode: pingResult.statusCode,
        responseTime: pingResult.responseTime,
        errorMessage: pingResult.errorMessage,
        checkedAt: checkStartTime,
      },
    });

    // Update monitored URL's updatedAt timestamp
    await prisma.monitoredURL.update({
      where: { id: monitoredUrl.id },
      data: { updatedAt: new Date() },
    });
  } catch (dbError) {
    logger.error({
      event: 'database_error',
      action: 'save_check_result',
      urlId: monitoredUrl.id,
      error: dbError.message,
    });
    // Return volatile result if database persistence failed
    savedResult = {
      id: 'temporary-' + Date.now(),
      urlId: monitoredUrl.id,
      ...pingResult,
      checkedAt: checkStartTime,
    };
  }

  logger.info({
    event: pingResult.status === 'UP' ? 'health_check_completed' : 'health_check_failed',
    urlId: monitoredUrl.id,
    urlName: monitoredUrl.name,
    status: pingResult.status,
    statusCode: pingResult.statusCode,
    responseTime: pingResult.responseTime,
    errorMessage: pingResult.errorMessage,
  });

  // State Transition Alert Logic
  if (monitoredUrl.alertEnabled && monitoredUrl.user?.email) {
    const previousStatus = previousCheck ? previousCheck.status : 'UP'; // Treat first failure as an alertable event

    // 1. Alert on UP -> DOWN transition (avoid spamming if consecutive DOWN)
    if (previousStatus === 'UP' && pingResult.status === 'DOWN') {
      sendDowntimeAlert({
        userEmail: monitoredUrl.user.email,
        urlName: monitoredUrl.name,
        targetUrl: monitoredUrl.url,
        statusCode: pingResult.statusCode,
        errorMessage: pingResult.errorMessage,
        responseTime: pingResult.responseTime,
      }).catch(err => {
        logger.error({ event: 'alert_trigger_error', error: err.message });
      });
    }

    // 2. Recovery on DOWN -> UP transition
    if (previousStatus === 'DOWN' && pingResult.status === 'UP') {
      sendRecoveryAlert({
        userEmail: monitoredUrl.user.email,
        urlName: monitoredUrl.name,
        targetUrl: monitoredUrl.url,
        statusCode: pingResult.statusCode,
        responseTime: pingResult.responseTime,
      }).catch(err => {
        logger.error({ event: 'recovery_trigger_error', error: err.message });
      });
    }
  }

  return savedResult;
}

/**
 * Checks multiple URLs concurrently using Promise.allSettled.
 * Guarantees that failure in one URL never crashes or halts other checks.
 *
 * @param {Array<object>} urlRecords - Array of MonitoredURL objects
 * @returns {Promise<Array<object>>}
 */
async function checkMultipleUrlsConcurrently(urlRecords) {
  if (!urlRecords || urlRecords.length === 0) {
    return [];
  }

  logger.info({
    event: 'concurrent_check_batch_started',
    batchSize: urlRecords.length,
  });

  const checkPromises = urlRecords.map(urlRecord => executeCheckForUrl(urlRecord));
  const settledResults = await Promise.allSettled(checkPromises);

  const results = settledResults.map((result, idx) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    logger.error({
      event: 'concurrent_check_item_error',
      urlId: urlRecords[idx].id,
      error: result.reason?.message || 'Unknown check failure',
    });
    return {
      urlId: urlRecords[idx].id,
      status: 'DOWN',
      statusCode: null,
      responseTime: 0,
      errorMessage: result.reason?.message || 'Execution error during check',
      checkedAt: new Date(),
    };
  });

  logger.info({
    event: 'concurrent_check_batch_completed',
    batchSize: urlRecords.length,
    upCount: results.filter(r => r.status === 'UP').length,
    downCount: results.filter(r => r.status === 'DOWN').length,
  });

  return results;
}

module.exports = {
  pingUrl,
  executeCheckForUrl,
  checkMultipleUrlsConcurrently,
};
