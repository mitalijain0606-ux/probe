import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../logger/logger.js';

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;

  if (!env.SMTP_HOST || !env.SMTP_PORT) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASSWORD ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });

  return transporter;
}

export interface DownAlertInput {
  to: string;
  url: string;
  label: string | null;
  consecutiveFails: number;
  errorType: string | null;
  errorMessage: string | null;
  checkedAt: Date;
}

export async function sendDownAlertEmail(input: DownAlertInput): Promise<void> {
  const client = getTransporter();
  const displayName = input.label ?? input.url;
  const subject = `[Probe] ${displayName} is down`;
  const text = [
    `${input.url} has failed ${input.consecutiveFails} consecutive health checks.`,
    input.errorType ? `Error type: ${input.errorType}` : null,
    input.errorMessage ? `Details: ${input.errorMessage}` : null,
    `Last checked: ${input.checkedAt.toISOString()}`,
  ]
    .filter(Boolean)
    .join('\n');

  if (!client) {
    logger.info(
      { event: 'alert.email_skipped', reason: 'smtp_not_configured', to: input.to, url: input.url },
      'SMTP not configured, skipping down alert email',
    );
    return;
  }

  try {
    await client.sendMail({
      from: env.ALERT_FROM_EMAIL ?? 'alerts@probe.local',
      to: input.to,
      subject,
      text,
    });
    logger.info({ event: 'alert.email_sent', to: input.to, url: input.url }, 'down alert email sent');
  } catch (error) {
    logger.error(
      { event: 'alert.email_failed', to: input.to, url: input.url, message: (error as Error).message },
      'failed to send down alert email',
    );
  }
}
