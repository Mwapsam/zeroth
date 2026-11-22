const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined
  });
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    logger.warn('SMTP not configured — skipping email to', to);
    return false;
  }
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || 'noreply@zeroth.com',
      to,
      subject,
      text,
      html
    });
    return true;
  } catch (err) {
    logger.error('sendMail failed', err);
    return false;
  }
}

module.exports = { sendMail };