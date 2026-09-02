const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!config.email.host || !config.email.user) {
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
    return transporter;
  } catch (err) {
    logger.error({
      event: 'email_transporter_init_failed',
      error: err.message,
    });
    return null;
  }
}

/**
 * Sends an email notification when a URL goes DOWN.
 * Non-blocking: will not throw errors to caller.
 */
async function sendDowntimeAlert({ userEmail, urlName, targetUrl, statusCode, errorMessage, responseTime }) {
  const mailer = getTransporter();

  logger.warn({
    event: 'downtime_alert_triggered',
    userEmail,
    urlName,
    targetUrl,
    statusCode,
    errorMessage,
  });

  if (!mailer) {
    logger.info({
      event: 'email_alert_simulated',
      message: 'Email credentials not configured in .env. Downtime alert simulated in logs.',
      userEmail,
      urlName,
      targetUrl,
      reason: errorMessage || `HTTP status ${statusCode}`,
    });
    return false;
  }

  const mailOptions = {
    from: config.email.from,
    to: userEmail,
    subject: `🚨 ALERT: ${urlName} is DOWN`,
    text: `Your monitored URL is currently DOWN.\n\nName: ${urlName}\nURL: ${targetUrl}\nStatus: DOWN\nStatus Code: ${statusCode || 'N/A'}\nResponse Time: ${responseTime}ms\nReason: ${errorMessage || 'Unknown failure'}\nTime: ${new Date().toUTCString()}\n\nPlease check your HealthWatch dashboard for more details.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fee2e2; border-radius: 8px; background-color: #fef2f2;">
        <h2 style="color: #b91c1c; margin-top: 0;">🚨 Outage Detected: ${urlName} is DOWN</h2>
        <p style="color: #374151; font-size: 16px;">Your monitored endpoint failed its health check.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #fff; border-radius: 6px; overflow: hidden;">
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 10px 14px; font-weight: bold; color: #4b5563;">URL:</td>
            <td style="padding: 10px 14px; color: #1f2937;"><a href="${targetUrl}">${targetUrl}</a></td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 10px 14px; font-weight: bold; color: #4b5563;">Status:</td>
            <td style="padding: 10px 14px; color: #b91c1c; font-weight: bold;">DOWN</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 10px 14px; font-weight: bold; color: #4b5563;">Status Code:</td>
            <td style="padding: 10px 14px; color: #1f2937;">${statusCode || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 10px 14px; font-weight: bold; color: #4b5563;">Response Time:</td>
            <td style="padding: 10px 14px; color: #1f2937;">${responseTime} ms</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-weight: bold; color: #4b5563;">Reason:</td>
            <td style="padding: 10px 14px; color: #b91c1c;">${errorMessage || `HTTP Status Code ${statusCode}`}</td>
          </tr>
        </table>
        <p style="font-size: 13px; color: #6b7280;">Timestamp: ${new Date().toISOString()}</p>
      </div>
    `,
  };

  try {
    const info = await mailer.sendMail(mailOptions);
    logger.info({
      event: 'email_alert_sent',
      userEmail,
      messageId: info.messageId,
      urlName,
    });
    return true;
  } catch (err) {
    logger.error({
      event: 'email_alert_failed',
      userEmail,
      error: err.message,
    });
    return false;
  }
}

/**
 * Sends a recovery email notification when a URL goes back UP.
 */
async function sendRecoveryAlert({ userEmail, urlName, targetUrl, statusCode, responseTime }) {
  const mailer = getTransporter();

  logger.info({
    event: 'recovery_alert_triggered',
    userEmail,
    urlName,
    targetUrl,
    statusCode,
  });

  if (!mailer) {
    logger.info({
      event: 'email_recovery_simulated',
      userEmail,
      urlName,
      targetUrl,
    });
    return false;
  }

  const mailOptions = {
    from: config.email.from,
    to: userEmail,
    subject: `✅ RECOVERED: ${urlName} is back UP`,
    text: `Great news! Your monitored URL has recovered and is now UP.\n\nName: ${urlName}\nURL: ${targetUrl}\nStatus: UP (${statusCode})\nResponse Time: ${responseTime}ms\nTime: ${new Date().toUTCString()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #d1fae5; border-radius: 8px; background-color: #ecfdf5;">
        <h2 style="color: #047857; margin-top: 0;">✅ Service Restored: ${urlName} is back UP</h2>
        <p style="color: #374151;">The endpoint is now responding normally.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #fff; border-radius: 6px;">
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 10px 14px; font-weight: bold; color: #4b5563;">URL:</td>
            <td style="padding: 10px 14px;"><a href="${targetUrl}">${targetUrl}</a></td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 10px 14px; font-weight: bold; color: #4b5563;">Status:</td>
            <td style="padding: 10px 14px; color: #047857; font-weight: bold;">UP (${statusCode})</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-weight: bold; color: #4b5563;">Response Time:</td>
            <td style="padding: 10px 14px;">${responseTime} ms</td>
          </tr>
        </table>
        <p style="font-size: 13px; color: #6b7280;">Timestamp: ${new Date().toISOString()}</p>
      </div>
    `,
  };

  try {
    const info = await mailer.sendMail(mailOptions);
    logger.info({
      event: 'email_recovery_sent',
      userEmail,
      messageId: info.messageId,
    });
    return true;
  } catch (err) {
    logger.error({
      event: 'email_recovery_failed',
      userEmail,
      error: err.message,
    });
    return false;
  }
}

module.exports = {
  sendDowntimeAlert,
  sendRecoveryAlert,
  getTransporter,
};
