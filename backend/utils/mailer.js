/**
 * Zeroth Business Solutions — Mailer
 * ----------------------------------------------------------
 * Thin wrapper around nodemailer that:
 *   • Degrades gracefully when SMTP is not configured (logs instead of crashing)
 *   • Provides reusable HTML templates for common ZBS notifications
 *   • Never throws on send failure at the call site (callers can .catch())
 *
 * SMTP is optional. Set the following in .env to enable:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_SECURE=false        # true for port 465, false for 587
 *   SMTP_USER=you@gmail.com
 *   SMTP_PASS=app-specific-password
 *   SMTP_FROM="Zeroth Business Solutions <no-reply@zeroth.com>"
 */

let nodemailer = null;
try {
    nodemailer = require('nodemailer');
} catch {
    console.warn('⚠️  nodemailer not installed — mailer will run in log-only mode');
}

/* ------------------------------------------------------------------ *
 *  Transport                                                          *
 * ------------------------------------------------------------------ */

let transporter = null;
let transporterReady = false;

if (nodemailer && process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            pool: true,
            maxConnections: 3,
            maxMessages: 100,
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 20000
        });

        transporterReady = true;
        console.log(`📧 Mailer enabled → ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}`);
    } catch (err) {
        console.error('❌ Failed to initialise mailer:', err.message);
        transporter = null;
        transporterReady = false;
    }
} else {
    console.log('📭 Mailer disabled (set SMTP_HOST + SMTP_USER in .env to enable)');
}

/* ------------------------------------------------------------------ *
 *  Core send                                                          *
 * ------------------------------------------------------------------ */

/**
 * Send an email. Never throws; returns a result object.
 *
 * @param {Object} opts
 * @param {string|string[]} opts.to
 * @param {string} opts.subject
 * @param {string} [opts.text]  Plain-text body
 * @param {string} [opts.html]  HTML body
 * @param {string} [opts.from]  Override default sender
 * @param {string|string[]} [opts.cc]
 * @param {string|string[]} [opts.bcc]
 * @param {Array}  [opts.attachments]
 * @returns {Promise<{sent:boolean, disabled?:boolean, error?:string, messageId?:string, info?:object}>}
 */
const sendMail = async ({ to, subject, text, html, from, cc, bcc, attachments }) => {
    if (!to) return { sent: false, error: 'No recipient provided' };
    if (!subject) return { sent: false, error: 'No subject provided' };

    const message = {
        from: from || process.env.SMTP_FROM || 'Zeroth Business Solutions <no-reply@zeroth.com>',
        to: Array.isArray(to) ? to.join(',') : to,
        subject,
        text: text || (html ? undefined : ''),
        html,
        cc, bcc,
        attachments
    };

    if (!transporterReady) {
        console.log('📭 [mailer disabled]', {
            to: message.to,
            subject: message.subject
        });
        return { sent: false, disabled: true };
    }

    try {
        const info = await transporter.sendMail(message);
        console.log(`📧 Sent → ${message.to} | ${message.subject} | ${info.messageId}`);
        return { sent: true, messageId: info.messageId, info };
    } catch (err) {
        console.error('❌ Mail send failed:', err.message);
        return { sent: false, error: err.message };
    }
};

/* ------------------------------------------------------------------ *
 *  Reusable layout                                                    *
 * ------------------------------------------------------------------ */

/**
 * Wrap body HTML in the standard Zeroth email shell.
 */
const layout = ({ title, preheader = '', bodyHtml, cta }) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${preheader}</span>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f6f8;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,.06);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1f7a3d 0%,#0f5132 100%);padding:22px 28px;color:#ffffff;">
              <div style="font-size:20px;font-weight:700;letter-spacing:.3px;">Zeroth Business Solutions</div>
              <div style="font-size:12px;opacity:.9;margin-top:2px;">🌟 Lever &amp; Fulcrum &nbsp;·&nbsp; Uplifting &amp; Sustaining Lives</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 28px 8px 28px;">
              <h1 style="margin:0 0 14px 0;font-size:20px;color:#0f172a;">${title}</h1>
              ${bodyHtml || ''}
              ${cta ? `
                <div style="margin:26px 0 6px 0;">
                  <a href="${cta.url}" style="display:inline-block;background:#1f7a3d;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;">${cta.label}</a>
                </div>
              ` : ''}
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:0 28px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" /></td></tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 28px 26px 28px;font-size:12px;color:#64748b;line-height:1.6;">
              <div><strong>Zeroth Business Solutions Ltd.</strong></div>
              <div>6570, Mumana Rd, Olympia, Lusaka &nbsp;·&nbsp; F/295a/b/5/F04, East Villa, Mazabuka</div>
              <div>Office: +260 97 905 2929 / 077 284 9845 &nbsp;·&nbsp; zerothbusinesssolutions@gmail.com</div>
              <div style="margin-top:10px;color:#94a3b8;">
                This is an automated message — please do not reply directly to this email.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/* ------------------------------------------------------------------ *
 *  Templated helpers                                                  *
 * ------------------------------------------------------------------ */

/**
 * Generic application acknowledgement (used by applicationController).
 */
const sendApplicationAck = async (application) => {
    if (!application?.applicantEmail) return { sent: false, error: 'No applicant email' };

    const {
        applicantName = 'Applicant',
        applicantEmail,
        type = 'application',
        reference,
        status = 'pending'
    } = application;

    const prettyType = String(type).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const html = layout({
        title: `We received your ${prettyType}`,
        preheader: `Reference ${reference} — we'll be in touch shortly.`,
        bodyHtml: `
          <p>Hi <strong>${applicantName}</strong>,</p>
          <p>Thank you for submitting your <strong>${prettyType}</strong> to Zeroth Business Solutions.
             Our team has received it and will review it shortly.</p>

          <table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0 8px 0;">
            <tr>
              <td style="padding:10px 12px;background:#f1f5f9;border-radius:8px 8px 0 0;font-size:13px;color:#334155;">
                <strong>Reference</strong>
              </td>
              <td style="padding:10px 12px;background:#f1f5f9;border-radius:8px 8px 0 0;text-align:right;font-family:monospace;font-size:13px;">
                ${reference || '—'}
              </td>
            </tr>
            <tr>
              <td style="padding:10px 12px;background:#f8fafc;font-size:13px;color:#334155;">
                <strong>Status</strong>
              </td>
              <td style="padding:10px 12px;background:#f8fafc;text-align:right;font-size:13px;text-transform:capitalize;">
                ${status}
              </td>
            </tr>
            <tr>
              <td style="padding:10px 12px;background:#f1f5f9;border-radius:0 0 8px 8px;font-size:13px;color:#334155;">
                <strong>Submitted</strong>
              </td>
              <td style="padding:10px 12px;background:#f1f5f9;border-radius:0 0 8px 8px;text-align:right;font-size:13px;">
                ${new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
              </td>
            </tr>
          </table>

          <p style="font-size:13px;color:#64748b;">
            Keep this reference handy — you may need it when contacting support.
          </p>
        `
    });

    const text =
`Hi ${applicantName},

Thank you for submitting your ${prettyType} to Zeroth Business Solutions.

Reference: ${reference || '—'}
Status:    ${status}
Submitted: ${new Date().toLocaleString()}

We'll be in touch shortly.

— Zeroth Business Solutions Ltd.
Office: +260 97 905 2929 / 077 284 9845
zerothbusinesssolutions@gmail.com`;

    return sendMail({
        to: applicantEmail,
        subject: `Zeroth — We received your ${prettyType} (Ref: ${reference || 'pending'})`,
        text,
        html
    });
};

/**
 * Welcome email after successful registration.
 */
const sendWelcomeEmail = async (user) => {
    if (!user?.email) return { sent: false, error: 'No user email' };

    const html = layout({
        title: `Welcome to Zeroth, ${user.name?.split(' ')[0] || 'friend'}!`,
        preheader: 'Your account is ready. Start exploring financial, brokerage and agricultural services.',
        bodyHtml: `
          <p>Hi <strong>${user.name || 'there'}</strong>,</p>
          <p>Your Zeroth Business Solutions account is now active. You can log in and start exploring
             our <strong>financial</strong>, <strong>brokerage</strong> and <strong>agricultural</strong> services.</p>
          <ul style="padding-left:20px;color:#334155;font-size:14px;line-height:1.7;">
            <li>💳 Loans, savings &amp; investments</li>
            <li>📈 24/7 ETF trading across African exchanges</li>
            <li>🌾 Agriculture Hub — farm produce, livestock &amp; permits</li>
            <li>🏘️ Rental listings &amp; landlord tools</li>
            <li>🧠 Vetted consultants across 7 categories</li>
          </ul>
        `,
        cta: {
            label: 'Open Zeroth',
            url: `${process.env.CLIENT_URL || 'http://localhost:5500'}/#login`
        }
    });

    return sendMail({
        to: user.email,
        subject: `Welcome to Zeroth Business Solutions`,
        text: `Hi ${user.name || 'there'},\n\nYour Zeroth account is ready. Welcome aboard!\n\n— Zeroth Business Solutions`,
        html
    });
};

/**
 * Order confirmation for market / agriculture orders.
 */
const sendOrderConfirmation = async (order) => {
    if (!order?.customer?.email) return { sent: false, error: 'No customer email' };

    const itemsHtml = (order.items || []).map((it) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">${it.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;">${it.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;">
          ZMW ${(it.price * it.quantity).toFixed(2)}
        </td>
      </tr>
    `).join('');

    const html = layout({
        title: `Order Confirmed — ${order.reference}`,
        preheader: 'Thank you for your order.',
        bodyHtml: `
          <p>Hi <strong>${order.customer.name}</strong>,</p>
          <p>We've received your order. Here's a summary:</p>

          <table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#334155;">Item</th>
                <th style="padding:10px 12px;text-align:center;font-size:12px;color:#334155;">Qty</th>
                <th style="padding:10px 12px;text-align:right;font-size:12px;color:#334155;">Amount</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding:10px 12px;text-align:right;font-weight:700;">Total</td>
                <td style="padding:10px 12px;text-align:right;font-weight:700;">ZMW ${Number(order.total || 0).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <p style="font-size:13px;color:#64748b;">
            Delivery: ${order.delivery?.address || '—'} · ${order.delivery?.city || ''}<br/>
            Payment: ${order.paymentMethod || '—'}
          </p>
        `
    });

    return sendMail({
        to: order.customer.email,
        subject: `Zeroth Order ${order.reference} — Confirmed`,
        text: `Order ${order.reference} confirmed. Total ZMW ${Number(order.total || 0).toFixed(2)}.`,
        html
    });
};

/**
 * Password reset email. The caller generates `resetUrl`.
 */
const sendPasswordReset = async (user, resetUrl) => {
    if (!user?.email) return { sent: false, error: 'No user email' };

    const html = layout({
        title: 'Reset your Zeroth password',
        preheader: 'Link expires in 30 minutes.',
        bodyHtml: `
          <p>Hi <strong>${user.name || 'there'}</strong>,</p>
          <p>We received a request to reset your Zeroth password. Click the button below to choose a new one.
             This link expires in <strong>30 minutes</strong>.</p>
          <p style="font-size:13px;color:#64748b;">If you didn't request this, you can safely ignore this email.</p>
        `,
        cta: { label: 'Reset Password', url: resetUrl }
    });

    return sendMail({
        to: user.email,
        subject: 'Reset your Zeroth password',
        text: `Reset link: ${resetUrl} (expires in 30 minutes)`,
        html
    });
};

/**
 * Animal permit seller notification (mirrors the SMS payload).
 */
const sendPermitSellerNotification = async ({ seller, animal, permitReference }) => {
    if (!seller?.phone) return { sent: false, error: 'No seller phone' };

    // SMS-only use case in production. If seller also has an email, send one.
    if (!seller.email) return { sent: false, error: 'No seller email (SMS only)' };

    const html = layout({
        title: 'Animal Sale Declaration',
        bodyHtml: `
          <p>Dear <strong>${seller.name || 'Seller'}</strong>,</p>
          <p>You are selling <strong>${animal?.description || 'an animal'}</strong>
             (Code: <code>${animal?.code || '—'}</code>) as part of permit
             <code>${permitReference}</code>.</p>
          <p>By confirming, you declare that this animal is yours, you confirm the sale,
             and you have no further claim.</p>
          <p>Reply <strong>YES</strong> to confirm or <strong>NO</strong> to decline.</p>
        `
    });

    return sendMail({
        to: seller.email,
        subject: `ZBS Permit Declaration — ${animal?.code || permitReference}`,
        text: `You are selling ${animal?.description || 'an animal'} (${animal?.code}). Reply YES to confirm, NO to decline.`,
        html
    });
};

/* ------------------------------------------------------------------ *
 *  Exports                                                            *
 * ------------------------------------------------------------------ */

module.exports = {
    // Core
    sendMail,
    layout,

    // Templates
    sendApplicationAck,
    sendWelcomeEmail,
    sendOrderConfirmation,
    sendPasswordReset,
    sendPermitSellerNotification,

    // Introspection
    isEnabled: () => transporterReady,
    getTransporter: () => transporter
};